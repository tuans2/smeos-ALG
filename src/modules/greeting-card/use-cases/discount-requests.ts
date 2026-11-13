import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { assertNotBelowFloor } from "@/modules/costing/use-cases/price-floor-guard"
import { assertNotSelfApproval } from "@/modules/organization/use-cases/assert-not-self-approval"
import type { TenantContext } from "@/core/tenancy"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { DiscountRepository, getDiscountRepository } from "../infra/discount-repository"
import { GreetingMessageRepository, getGreetingMessageRepository } from "../infra/greeting-message-repository"
import { discountError, discountVndOf, parseMaxDiscountPercent, type DiscountAsk } from "../domain/discount-request"
import { roleOf } from "../domain/internal-message"
import { visibleTarget } from "./internal-messages"
import { queueStaffNotification } from "./notify-staff"

async function maxPercent(ctx: TenantContext) {
  return parseMaxDiscountPercent((await getCurrentOrganization(ctx))?.settings)
}

/** Sale xin giảm giá cho một đơn đã đặt — gửi thẳng Điều hành, mỗi đơn một yêu cầu chờ duyệt. */
export async function requestDiscount(
  ctx: TenantContext,
  input: { orderId: string; ask: DiscountAsk; reason: string },
  repo = getDiscountRepository(),
) {
  const reason = input.reason.trim()
  if (reason.length < 3) throw validationFailed({ reason: "Ghi lý do xin giảm (ít nhất 3 ký tự)" })
  await visibleTarget(ctx, { orderId: input.orderId }, getGreetingMessageRepository())
  const order = await repo.orderBase(ctx, input.orderId)
  if (!order) throw notFound()
  if (order.status === "CANCELLED") throw conflict("Đơn đã huỷ")
  // Trần chung (PO 07/11/2026): giảm tay + các khoản giảm đã áp ≤ 50% tiền hàng
  const error = discountError(input.ask, order.baseTotalVnd, await maxPercent(ctx), order.prior)
  if (error) throw validationFailed({ discount: error })
  if ((await repo.listPending(ctx)).some((r) => r.order_id === order.id)) throw conflict("Đơn này đang có một yêu cầu giảm giá chờ duyệt")

  const created = await repo.createRequest(ctx, {
    orderId: order.id, senderRole: roleOf(ctx.capabilities) ?? "SALE", reason,
    payload: { status: "PENDING", baseTotalVnd: order.baseTotalVnd, requestedVnd: discountVndOf(input.ask, order.baseTotalVnd), ...input.ask },
  })

  queueStaffNotification(ctx.organizationId, "DISCOUNT_REQUESTED", {
    orderId: order.id,
    orderCode: order.code ?? null,
    amountVnd: discountVndOf(input.ask, order.baseTotalVnd),
    reason,
    assignedSaleId: ctx.userId,
  })

  return { id: created.id, createdAt: created.created_at.toISOString() }
}

/**
 * Điều hành duyệt (giữ mức xin hoặc sửa mức — vẫn trong trần) hoặc từ chối, kèm ghi chú.
 * Duyệt thì giá chốt của đơn cập nhật ngay; người xin nhận kết quả trong Hộp việc.
 */
export async function decideDiscount(
  ctx: TenantContext,
  input: { requestId: string; approve: boolean; ask?: DiscountAsk | undefined; note: string },
  repo = getDiscountRepository(),
) {
  const note = input.note.trim()
  if (!input.approve && note.length < 3) throw validationFailed({ note: "Ghi lý do từ chối để sale báo lại khách" })
  const pending = (await repo.listPending(ctx)).find((r) => r.id === input.requestId)
  if (!pending?.order_id) throw (await getGreetingMessageRepository().findById(ctx, input.requestId)) ? conflict("Yêu cầu này đã được xử lý") : notFound()
  const order = await repo.orderBase(ctx, pending.order_id)
  if (!order) throw notFound()
  if (input.approve) await assertNotSelfApproval(ctx, pending.sender_id)

  const requested = pending.payload as unknown as DiscountAsk
  const ask: DiscountAsk = input.ask ?? (typeof requested.percent === "number" ? { percent: requested.percent } : { amountVnd: requested.amountVnd })
  if (input.approve) {
    const error = discountError(ask, order.baseTotalVnd, await maxPercent(ctx), order.prior)
    if (error) throw validationFailed({ discount: error })
    // Giảm xuống dưới giá sàn chỉ người có C10 (Điều hành) duyệt được (checklist ALG 3.4, 9.11)
    await assertNotBelowFloor(ctx, order.lines ?? [], order.baseTotalVnd - discountVndOf(ask, order.baseTotalVnd))
  }
  return repo.decide(ctx, {
    requestId: input.requestId, approve: input.approve, approvedVnd: input.approve ? discountVndOf(ask, order.baseTotalVnd) : 0,
    approvedPercent: ask.percent, note,
  })
}
