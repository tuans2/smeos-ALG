import type { TenantContext } from "@/core/tenancy"
import { OrderVatRepository, getOrderVatRepository } from "../infra/order-vat-repository"
import { OrderSlipRepository, getOrderSlipRepository } from "../infra/order-slip-repository"
import { normalizeInvoiceInfo, type VatChange, type VatInvoiceInfo } from "../domain/order-vat"
import { assertOrderInScope } from "./order-scope"

export async function getOrderVat(ctx: TenantContext, orderId: string, repo = getOrderVatRepository()) {
  await assertOrderInScope(ctx, orderId)
  return repo.get(ctx, orderId)
}

/** VAT + phần bổ sung Thẻ Đơn Khách hàng (mã mẫu, ảnh gốc, ghi chú khách) — cùng kiểm tra phạm vi xem. */
export async function getOrderSlip(ctx: TenantContext, orderId: string, repo = getOrderVatRepository(), slips = getOrderSlipRepository()) {
  await assertOrderInScope(ctx, orderId)
  const [vat, extras] = await Promise.all([repo.get(ctx, orderId), slips.get(ctx, orderId)])
  return { ...vat, ...extras }
}

/** Bật/tắt VAT (8% hoặc 10%) và lưu thông tin xuất hoá đơn. Tổng & còn lại do máy chủ tính lại. */
export async function setOrderVat(
  ctx: TenantContext,
  orderId: string,
  input: VatChange & Partial<Record<keyof VatInvoiceInfo, string | null | undefined>>,
  repo = getOrderVatRepository()
) {
  await assertOrderInScope(ctx, orderId)
  return repo.set(ctx, orderId, { enabled: input.enabled, rate: input.rate }, normalizeInvoiceInfo(input))
}
