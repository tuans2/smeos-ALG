import { AppError, validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import { isInTransit } from "@/modules/greeting-card/domain/cancellation-request"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { roleOf } from "@/modules/greeting-card/domain/internal-message"
import { assertOrderInScope } from "@/modules/greeting-card/use-cases/order-scope"
import { cancellationRequestBody } from "@/app/api/v1/_contracts/requests-greeting"

/**
 * `POST /api/v1/greeting-card/cancellation-requests`
 * Sale / Điều phối đề xuất Hủy đơn hoặc Hoàn tiền (Task #1). Cần R1 và một vai nhắn nội bộ.
 */
export const POST = handle(async (req: Request) => {
  const { ctx } = await requireTenantContext(req)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderRead)
  const senderRole = roleOf(ctx.capabilities)
  if (!senderRole) requireCapability(ctx, GREETING_CARD_CAPABILITY.manage)

  const parsed = cancellationRequestBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  // Sale "chỉ khách của mình" không đề xuất huỷ/hoàn đơn của sale khác (404 như mọi thao tác tiền)
  await assertOrderInScope(ctx, parsed.data.orderId)
  const result = await new CancellationRepository().createProposal(ctx, {
    orderId: parsed.data.orderId,
    senderRole: senderRole ?? "SALE",
    proposal: {
      type: parsed.data.type,
      reason: parsed.data.reason,
      refundAmountVnd: parsed.data.refundAmountVnd,
      note: parsed.data.note,
    },
  })

  return jsonResponse({ data: result }, { status: 201 })
})

/**
 * `GET /api/v1/greeting-card/cancellation-requests`
 * Danh sách đề xuất đang chờ duyệt — Điều hành (R6 hủy đơn hoặc R10 hoàn tiền); Điều phối (R5) chỉ thấy
 * đề xuất huỷ đơn đang giao, là loại mình được duyệt (PO 15/10/2026).
 */
export const GET = handle(async (req: Request) => {
  const { ctx } = await requireTenantContext(req)
  const { orderCancel, paymentRefund, deliveryManage } = GREETING_CARD_CAPABILITY
  const admin = ctx.capabilities.has(orderCancel) || ctx.capabilities.has(paymentRefund)
  if (!admin && !ctx.capabilities.has(deliveryManage)) {
    throw new AppError("CAPABILITY_DENIED", `Thiếu năng lực ${orderCancel}`, { capability: orderCancel })
  }
  const pending = await new CancellationRepository().listPending(ctx)
  const visible = admin
    ? pending
    : pending.filter((r) => isInTransit(r.delivery_status) && (r.payload as { type?: string } | null)?.type !== "PARTIAL_REFUND")
  return jsonResponse({ data: visible })
})
