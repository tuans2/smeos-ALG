import { timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"
import { notFound, unauthenticated } from "@/core/http/errors"
import { log } from "@/core/observability/log"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { findInvoiceByCode, markInvoicePaid } from "../infra/subscription-repository"
import { applyOverpayment } from "../infra/plan-change-repository"
import { findInvoiceCode } from "../domain/subscription-rules"

/**
 * SePay báo giao dịch vào tài khoản nhận tiền thuê bao của nền tảng (checklist ALG 10.7, PO Q9). Xác thực bằng
 * `SEPAY_PLATFORM_API_KEY` (chưa cấu hình → 404, đối soát tự động tắt). Khớp mã hoá đơn trong nội dung và đủ số
 * tiền → ghi đã thu (mã giao dịch SePay chống ghi trùng); không khớp thì để Console xác nhận tay. Chuyển dư → phần dư
 * trừ vào hoá đơn kỳ kế tiếp trong cùng giao dịch (PO 12/11/2026, audit BL-27).
 */

export interface SepayIncoming { id: number | string; transferType: string; transferAmount: number; content: string }

function keyMatches(given: string | null): boolean {
  const expected = env.SEPAY_PLATFORM_API_KEY
  if (!expected) throw notFound()
  if (!given) return false
  const a = Buffer.from(given), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function handlePlatformSepay(apiKey: string | null, tx: SepayIncoming): Promise<{ matched: boolean; reason?: string }> {
  if (!keyMatches(apiKey)) throw unauthenticated()
  if (tx.transferType.toLowerCase() !== "in") return { matched: false, reason: "not_incoming" }
  const code = findInvoiceCode(tx.content)
  if (!code) return { matched: false, reason: "no_invoice_code" }
  const invoice = await findInvoiceByCode(code)
  if (!invoice || invoice.status !== "PENDING") return { matched: false, reason: "invoice_not_pending" }
  if (tx.transferAmount < invoice.amount_vnd) {
    log.warn("subscription.sepay_amount_short", { invoiceId: invoice.id, expected: invoice.amount_vnd, received: tx.transferAmount })
    return { matched: false, reason: "amount_short" }
  }
  const now = new Date()
  const paid = await runInTransaction(async (db) => {
    const row = await markInvoicePaid(db, invoice.id, `SEPAY-${tx.id}`, now)
    if (row) await applyOverpayment(db, row, tx.transferAmount - row.amount_vnd, now)
    return row
  })
  return paid ? { matched: true } : { matched: false, reason: "already_paid" }
}
