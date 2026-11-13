import type { TenantContext } from "@/core/tenancy"
import { notFound, conflict } from "@/core/http/errors"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { BrochureOrderRepository, getBrochureOrderRepository } from "../infra/brochure-order-repository"
import { queueOrderNotification } from "./notify-customer"
import { assertOrderInScope } from "./order-scope"

/**
 * Điều hành cảnh báo "Chưa nhận được tiền": khách đã gửi bill / báo chuyển khoản Lần 1 nhưng tiền
 * không về (bill sai, chuyển thiếu…). Bỏ trạng thái báo chuyển khoản + ảnh bill trên phiên để trang
 * khách quay về chờ thanh toán (hiện lại mã QR), ghi lịch sử đơn và nhắc khách chuyển khoản (PO 15/10/2026).
 * Chỉ áp dụng khi sổ thu còn 0 đ — tiền đã ghi sổ thì điều chỉnh qua hoàn tiền/sổ thu.
 */
export async function rejectReportedPayment(
  ctx: TenantContext,
  orderId: string,
  input: { reason?: string | null | undefined } = {},
  orders = getBrochureOrderRepository(),
  repo = getGreetingCardRepository()
) {
  await assertOrderInScope(ctx, orderId, orders)
  const order = await orders.findBrochureOrder(ctx, orderId)
  if (!order) throw notFound()
  if (order.status === "CANCELLED") throw conflict("Đơn hàng đã huỷ")
  if (Number(order.paid_vnd) > 0) {
    throw conflict("Đơn đã ghi nhận tiền vào sổ thu — điều chỉnh qua sổ thu hoặc hoàn tiền")
  }
  // Phiên đọc kèm đơn đã lọc theo tổ chức (cùng cách Điều phối tiếp nhận đơn)
  const session = order.greeting_sessions[0]
  if (!session || (session.status !== "PAYMENT_REPORTED" && !session.payment_proof_asset_id)) {
    throw conflict("Khách chưa báo chuyển khoản cho đơn này")
  }

  await repo.updateSession(session.id, { status: "ORDER_SUBMITTED", paymentProofAssetId: null })
  const reason = input.reason?.trim() || "Không thấy tiền về tài khoản tiệm"
  await orders.applyProgress(ctx, order, {
    eventType: "PAYMENT_NOT_RECEIVED",
    noteAppend: `[Điều hành: chưa nhận được tiền] ${reason}`,
  })
  queueOrderNotification(ctx.organizationId, order.id, "PAYMENT_REMINDER")
  return { orderId: order.id, orderCode: order.code, reason }
}
