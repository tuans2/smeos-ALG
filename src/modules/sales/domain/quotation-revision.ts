/** Ảnh chụp một phiên bản báo giá (checklist ALG 3.10) — luật thuần, không import Prisma. */

import type { Quotation } from "./quotation"

export interface QuotationSnapshot {
  subtotal: number
  discountAmount: number
  shippingFee: number
  totalAmount: number
  validUntil: string | null
  terms: string | null
  items: Array<{ name: string; variantLabel: string | null; qty: number; unitPrice: number; totalPrice: number; note: string | null }>
}

export function quotationSnapshot(q: Quotation): QuotationSnapshot {
  return {
    subtotal: q.subtotal,
    discountAmount: q.discountAmount,
    shippingFee: q.shippingFee,
    totalAmount: q.totalAmount,
    validUntil: q.validUntil ? new Date(q.validUntil).toISOString() : null,
    terms: q.terms ?? null,
    items: q.items.map((it) => ({
      name: it.name, variantLabel: it.variantLabel ?? null, qty: it.qty, unitPrice: it.unitPrice, totalPrice: it.totalPrice, note: it.note ?? null,
    })),
  }
}
