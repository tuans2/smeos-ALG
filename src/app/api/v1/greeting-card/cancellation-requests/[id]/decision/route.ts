import { assertNotSelfApproval } from "@/modules/organization/use-cases/assert-not-self-approval"
import { AppError, notFound, validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import { canDecideCancellation, isInTransit } from "@/modules/greeting-card/domain/cancellation-request"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { queueOrderNotification } from "@/modules/greeting-card/use-cases/notify-customer"
import { cancellationDecisionBody } from "@/app/api/v1/_contracts/requests-greeting"

/**
 * `POST /api/v1/greeting-card/cancellation-requests/:id/decision`
 * Duyệt hoặc từ chối đề xuất Hủy/Hoàn tiền. Duyệt chỉ đổi trạng thái đơn — hoàn tiền là bước riêng
 * (danh sách "Cần hoàn tiền", R10). Hủy → R6; đơn đang giao thì Điều phối (R5) cũng duyệt được (PO 15/10/2026).
 */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  const { id } = await context.params
  const parsed = cancellationDecisionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const repo = new CancellationRepository()
  const info = await repo.getPendingInfo(ctx, id)
  if (!info) throw notFound()
  const denied = canDecideCancellation(info.type, ctx, { inTransit: isInTransit(info.deliveryStatus), requesterId: info.requesterId }, GREETING_CARD_CAPABILITY)
  if (denied) throw new AppError("CAPABILITY_DENIED", denied)
  if (parsed.data.approve) await assertNotSelfApproval(ctx, info.requesterId)

  const result = await repo.decide(ctx, {
    requestId: id,
    approve: parsed.data.approve,
    note: parsed.data.note,
    actualRefundVnd: parsed.data.actualRefundVnd,
  })

  // Báo khách khi đơn bị huỷ theo đề xuất (như nút Huỷ của sổ thu)
  if (result.orderStatus === "CANCELLED" && parsed.data.approve) queueOrderNotification(ctx.organizationId, result.orderId, "CANCELLED")
  return jsonResponse({ data: result })
})
