/**
 * Ghi khoản sàn đã thu cho đơn nhập từ kênh bán (lượt hệ thống, PO 12/11/2026, audit BL-34). Trước đây đơn sàn đã trả
 * tiền vào sổ như đơn chưa thu (`paid_vnd = 0`) — bị nhắc thu, có thể bị tự huỷ, báo cáo thu lệch.
 * Dùng chung đường ghi thu đơn thường: đơn → Đã xác nhận + sang Điều phối trong cùng giao dịch.
 * Hình thức `MARKETPLACE` chỉ máy chủ ghi (không có trong danh mục nhân viên chọn), mã tham chiếu = mã đơn trên sàn.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { StandardPaymentRepository } from "../infra/standard-payment-repository"

export const MARKETPLACE_PAYMENT_METHOD = "MARKETPLACE"

export async function recordChannelPrepayment(
  ctx: TenantContext,
  input: { orderId: string; amountVnd: number; externalOrderId: string; channelLabel: string },
  repo: Pick<StandardPaymentRepository, "record"> = new StandardPaymentRepository(),
) {
  if (input.amountVnd <= 0) return null
  return repo.record(ctx, { id: input.orderId }, {
    amountVnd: input.amountVnd,
    method: MARKETPLACE_PAYMENT_METHOD,
    reference: input.externalOrderId.slice(0, 120),
    note: `${input.channelLabel} đã thu của khách`.slice(0, 500),
  })
}
