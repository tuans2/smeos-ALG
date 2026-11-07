/** VAT trên đơn ngoài Thẻ chào (PO 07/11/2026, Q10) — xem `standard-order-vat-repository.ts`. */

import type { TenantContext } from "@/core/tenancy"
import { normalizeInvoiceInfo, type VatChange, type VatInvoiceInfo } from "@/modules/greeting-card/domain/order-vat"
import { StandardOrderVatRepository } from "../infra/standard-order-vat-repository"

export function getStandardOrderVat(ctx: TenantContext, orderId: string, repo = new StandardOrderVatRepository()) {
  return repo.get(ctx, orderId)
}

/** Bật/tắt VAT (8% hoặc 10%) và lưu thông tin xuất hoá đơn; tổng và còn phải thu do máy chủ tính lại. */
export function setStandardOrderVat(
  ctx: TenantContext,
  orderId: string,
  input: VatChange & Partial<Record<keyof VatInvoiceInfo, string | null | undefined>>,
  repo = new StandardOrderVatRepository()
) {
  return repo.set(ctx, orderId, { enabled: input.enabled, rate: input.rate }, normalizeInvoiceInfo(input))
}
