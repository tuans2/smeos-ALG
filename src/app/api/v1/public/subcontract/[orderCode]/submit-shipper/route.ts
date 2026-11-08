import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { conflict, unprocessable, validationFailed } from "@/core/http/errors"
import { loadSubcontractOrderForBranch } from "@/modules/greeting-card/use-cases/authorize-subcontract-branch"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { SUBCONTRACT_STEP_NOT_ALLOWED, SUBCONTRACT_STEP_PRECONDITION, subcontractStepAllowed } from "@/modules/greeting-card/domain/subcontract-order"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { subcontractPhotoApprovalBlocker } from "@/modules/greeting-card/use-cases/subcontract-photo-gate"
import { log } from "@/core/observability/log"
import { queueOrderNotification } from "@/modules/greeting-card/use-cases/notify-customer"
import { queueStaffNotification } from "@/modules/greeting-card/use-cases/notify-staff"
import {
  cancelSubcontractReminderSteps,
  getMilestoneSteps,
} from "@/modules/greeting-card/use-cases/cancel-subcontract-reminder-steps"
import { subcontractShipperBody } from "@/app/api/v1/public/_contracts/requests"

/**
 * POST /api/v1/public/subcontract/[orderCode]/submit-shipper
 *
 * Cửa hàng/chi nhánh nhập thông tin shipper sau khi ảnh thành phẩm đã được duyệt.
 * Không yêu cầu đăng nhập — xác minh qua branchId đã claim đơn.
 * Kết quả: lưu shipper info vào metadata, gửi thông báo điều phối để bắt đầu giao hàng.
 */
export const POST = handle<[{ params: Promise<{ orderCode: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "subcontract-submit-shipper", limit: 20, windowMs: 60_000 })

  const { orderCode } = await context.params
  const body = await request.json().catch(() => ({}))
  const parsed = subcontractShipperBody.safeParse(body)
  if (!parsed.success) {
    throw validationFailed(Object.fromEntries(
      parsed.error.issues.map((i) => [i.path[0] ?? "body", i.message])
    ))
  }

  const { branchId, shipperName, shipperPhone, shipperNote } = parsed.data
  const repo = new SubcontractOrderRepository()
  const order = await loadSubcontractOrderForBranch(request, orderCode, branchId, repo)

  // Xác minh chi nhánh đang claim đơn này
  const coordMeta = (order.coordination?.metadata as Record<string, unknown> | null) ?? {}
  const subState = coordMeta.subcontract_dispatch as Record<string, unknown> | undefined
  if (subState?.claimedBranchId !== branchId) {
    throw unprocessable("Đơn hàng này không thuộc chi nhánh của bạn.")
  }

  // Kiểm tra đơn đã qua ảnh thành phẩm và chưa giao — mới cho phép nhập shipper
  const alreadyDelivering = order.delivery_status === "DELIVERING" || order.delivery_status === "DELIVERED"
  if (!alreadyDelivering && !subcontractStepAllowed("SHIPPER", order)) throw conflict(SUBCONTRACT_STEP_NOT_ALLOWED.SHIPPER)
  // Còn chờ khách duyệt ảnh thành phẩm → chưa giao (theo chế độ duyệt ảnh tiệm chọn)
  const waitingCustomer = alreadyDelivering ? null : await subcontractPhotoApprovalBlocker(order.organization_id, order.id)
  if (waitingCustomer) throw conflict(waitingCustomer)

  // Kiểm tra shipper chưa được nhập (idempotent — nếu đã có thì bỏ qua)
  const existingShipper = coordMeta.shipper_info as Record<string, unknown> | undefined
  if (existingShipper?.shipperPhone) {
    return jsonResponse({
      data: {
        success: true,
        alreadySubmitted: true,
        message: `Thông tin shipper đã được cung cấp trước đó: ${String(existingShipper.shipperName)} — ${String(existingShipper.shipperPhone)}`,
        shipperInfo: existingShipper,
      },
    })
  }

  const store = new SubcontractStepStore()

  const shipperInfo = {
    shipperName,
    shipperPhone,
    shipperNote: shipperNote || null,
    submittedByBranchId: branchId,
    submittedAt: new Date().toISOString(),
  }

  // Cập nhật metadata + đổi delivery_status → DELIVERING
  const saved = await store.applyStep({
    organizationId: order.organization_id,
    orderId: order.id,
    order: { delivery_status: "DELIVERING" },
    require: SUBCONTRACT_STEP_PRECONDITION.SHIPPER,
    metadata: (current) => ({ ...current, shipper_info: shipperInfo, shipper_submitted_at: shipperInfo.submittedAt }),
    events: [{
      axis: "delivery",
      fromValue: order.delivery_status,
      toValue: "DELIVERING",
      actorId: `branch_${branchId}`,
      reason: `[Shipper] ${shipperName} — ${shipperPhone}${shipperNote ? ` (${shipperNote})` : ""}`,
    }],
  })

  if (!saved) throw conflict(SUBCONTRACT_STEP_NOT_ALLOWED.SHIPPER)

  // Thông báo cho hệ thống (ZNS/Telegram nội bộ) — điều phối viên biết để chuẩn bị bàn giao
  queueOrderNotification(order.organization_id, order.id, "DISPATCHED")
  queueStaffNotification(order.organization_id, "READY", {
    orderId: order.id,
    orderCode: order.code,
    amountVnd: Number(order.total_vnd),
    assignedSaleId: order.greeting_sessions?.[0]?.sale_id ?? null,
    extraNote: `🚗 Shipper: ${shipperName} — ${shipperPhone}`,
  })

  // ✅ First-Wins Mutex (Store-Stream): Hủy toàn bộ M3 reminders vì cửa hàng đã điền qua link
  cancelSubcontractReminderSteps({
    organizationId: order.organization_id,
    orderId: order.id,
    steps: getMilestoneSteps("M3"),
    reason: "store_action_via_link",
    actorId: `branch_${branchId}`,
  }).catch((err) => {
    log.warn("subcontract.cancel_m3_reminders_failed", {
      orderCode: order.code,
      error: err instanceof Error ? err.message : String(err),
    })
  })

  log.info("subcontract.shipper_submitted", {
    orderId: order.id,
    orderCode: order.code,
    branchId,
    shipperName,
    shipperPhone,
  })

  return jsonResponse({
    data: {
      success: true,
      message: `✅ Thông tin shipper đã được ghi nhận! ${shipperName} (${shipperPhone}) sẽ đến nhận hàng. Điều phối viên đã được thông báo để chuẩn bị bàn giao.`,
      shipperInfo,
      deliveryStatus: "DELIVERING",
    },
  })
})

export const dynamic = "force-dynamic"
