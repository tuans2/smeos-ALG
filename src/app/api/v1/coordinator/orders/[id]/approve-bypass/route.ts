/**
 * approve-bypass/route.ts
 *
 * POST /api/v1/coordinator/orders/[id]/approve-bypass
 *
 * Điều phối viên phê duyệt (APPROVE) hoặc từ chối (REJECT) yêu cầu bỏ qua bằng chứng của chi nhánh.
 * - Khi APPROVE: Kích hoạt bước tiếp theo (chuyển production_status hoặc delivery_status),
 *   triệt tiêu reminder tương ứng, đồng thời trừ 2 điểm chất lượng KPI của chi nhánh.
 * - Khách hàng sẽ thấy tiến độ chuyển bước kèm ghi chú bất khả kháng.
 */

import { prepareLateDeliveryDeduction } from "@/modules/greeting-card/use-cases/craft-fee-deductions"
import { CraftFeeFactsRepository } from "@/modules/greeting-card/infra/craft-fee-facts-repository"
import { jsonResponse } from "@/core/http/response"
import { conflict, notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { SUBCONTRACT_STEP_NOT_ALLOWED, SUBCONTRACT_STEP_PRECONDITION } from "@/modules/greeting-card/domain/subcontract-order"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { subcontractPhotoApprovalBlocker } from "@/modules/greeting-card/use-cases/subcontract-photo-gate"
import { log } from "@/core/observability/log"
import {
  cancelSubcontractReminderSteps,
  getMilestoneSteps,
} from "@/modules/greeting-card/use-cases/cancel-subcontract-reminder-steps"
import { queueOrderNotification } from "@/modules/greeting-card/use-cases/notify-customer"
import { bypassDecisionBody } from "@/app/api/v1/_contracts/requests-coordinator"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

const STEP_LABEL = { QC: "ảnh thành phẩm", SHIPPER: "thông tin shipper", POD: "ảnh giao hàng" } as const

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id: orderId } = params as { id: string }

    const body = await request.json().catch(() => ({}))
    const parsed = bypassDecisionBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)

    const { step, decision, reviewNote } = input
    const repo = new SubcontractOrderRepository()
    const order = await repo.findSubcontractById(orderId, ctx.organizationId)
    if (!order) throw notFound()

    const store = new SubcontractStepStore()
    const nowIso = new Date().toISOString()
    const decisionNote = reviewNote || (decision === "REJECT" ? "Điều phối yêu cầu cung cấp đầy đủ hình ảnh/thông tin" : "Điều phối chấp thuận vì lý do bất khả kháng")
    let bypassRequest: Record<string, unknown> = {}
    /** Đổi PENDING → quyết định ngay dưới khoá dòng: bấm đúp hoặc hai người duyệt cùng lúc chỉ một lần thắng. */
    const decide = (current: Record<string, unknown>, status: "APPROVED" | "REJECTED") => {
      const requests = (current.bypass_requests as Record<string, unknown> | undefined) ?? {}
      const pending = requests[step] as Record<string, unknown> | undefined
      if (pending?.status !== "PENDING") throw conflict(`Không có yêu cầu bỏ qua ${STEP_LABEL[step]} đang chờ duyệt cho đơn hàng này.`)
      bypassRequest = pending
      return { ...requests, [step]: { ...pending, status, decisionAt: nowIso, decidedBy: ctx.userId, reviewNote: decisionNote } }
    }

    if (decision === "REJECT") {
      await store.mutateMetadata(order.organization_id, order.id, (current) => ({
        next: { ...current, bypass_requests: decide(current, "REJECTED") },
        result: undefined,
      }))
      return jsonResponse({
        data: { success: true, decision: "REJECT", message: "Đã từ chối yêu cầu bỏ qua. Chi nhánh phải thực hiện cung cấp bằng chứng." },
      })
    }

    // APPROVE: duyệt + mở bước tiếp theo trong MỘT giao dịch, chỉ khi đơn đang ở đúng bước
    const actorId = `coordinator:${ctx.userId}`
    const stepWrite = {
      QC: {
        order: { production_status: "READY" as const },
        fields: { last_qc_uploaded_at: nowIso, last_qc_uploaded_by: `coordinator_bypass:${ctx.userId}`, bypass_qc_approved: true },
        event: { axis: "production", fromValue: order.production_status, toValue: "READY" },
      },
      SHIPPER: {
        order: { delivery_status: "DELIVERING" as const },
        fields: {
          shipper_info: { shipperName: "Giao gấp (Miễn thông tin)", shipperPhone: "", submittedAt: nowIso, bypassedByCoordinator: true },
          bypass_shipper_approved: true,
        },
        event: { axis: "delivery", fromValue: order.delivery_status, toValue: "DELIVERING" },
      },
      POD: {
        order: { delivery_status: "DELIVERED" as const, status: "COMPLETED" as const },
        fields: {
          bypass_pod_approved: true,
          delivery_proof: { photoUrls: [], note: "Bỏ qua ảnh giao hàng (Điều phối duyệt)", deliveredAt: nowIso, confirmedByCoordinator: ctx.userId, confirmMode: "bypassed_without_photo" },
        },
        event: { axis: "status", fromValue: order.status, toValue: "COMPLETED" },
      },
    }[step]

    // Bỏ qua thông tin shipper không bỏ qua bước khách duyệt ảnh thành phẩm
    const waitingCustomer = step === "SHIPPER" ? await subcontractPhotoApprovalBlocker(order.organization_id, order.id) : null
    if (waitingCustomer) throw conflict(waitingCustomer)
    const applyLateFee =
      step === "POD" ? await prepareLateDeliveryDeduction(order.organization_id, order.id, new CraftFeeFactsRepository(), new Date(nowIso)) : (m: Record<string, unknown>) => m
    const saved = await store.applyStep({
      organizationId: order.organization_id,
      orderId: order.id,
      order: stepWrite.order,
      require: SUBCONTRACT_STEP_PRECONDITION[step],
      metadata: (current) => applyLateFee({ ...current, ...stepWrite.fields, bypass_requests: decide(current, "APPROVED") }),
      events: [{ ...stepWrite.event, actorId, reason: `[Duyệt bỏ qua ${STEP_LABEL[step]}] ${String(bypassRequest.reason ?? "")}` }],
    })
    if (!saved) throw conflict(SUBCONTRACT_STEP_NOT_ALLOWED[step])

    // Trừ điểm SAU khi duyệt đã ghi: lần duyệt thứ hai đã bị chặn ở trên nên chỉ trừ một lần
    const branchId = (bypassRequest.requestedByBranchId as string) || ""
    let penaltyResult = null
    if (branchId) {
      const penalty = await new ChainBranchRepository().applyPenalty(
        order.organization_id,
        branchId,
        "BYPASS",
        `Bỏ qua bằng chứng ${STEP_LABEL[step]} đơn #${order.code} (Lý do: ${String(bypassRequest.reason ?? "")})`
      )
      penaltyResult = { newQualityScore: penalty.newQualityScore, bypassCount: penalty.count }
    }

    // Triệt tiêu các reminder tương ứng
    const milestoneKey = step === "QC" ? "M2" : step === "SHIPPER" ? "M3" : "M4"
    await cancelSubcontractReminderSteps({
      organizationId: order.organization_id,
      orderId: order.id,
      steps: getMilestoneSteps(milestoneKey as "M2" | "M3" | "M4"),
      reason: "coordinator_action",
      actorId: ctx.userId,
    })

    // Notify khách hàng chuyển bước
    const notifyEvent = step === "QC" ? "READY" : step === "SHIPPER" ? "DISPATCHED" : "DELIVERED"
    queueOrderNotification(order.organization_id, order.id, notifyEvent)

    log.info("coordinator.approve_bypass", {
      orderId: order.id,
      orderCode: order.code,
      step,
      branchId,
      actorId: ctx.userId,
    })

    return jsonResponse({
      data: {
        success: true,
        decision: "APPROVE",
        message: `✅ Đã chấp thuận bỏ qua ${STEP_LABEL[step]}. Bước tiếp theo đã được mở khóa cho chi nhánh.`,
        penalty: penaltyResult,
      },
    })
  },
})

export const dynamic = "force-dynamic"
