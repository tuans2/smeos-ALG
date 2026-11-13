import { buildVietQrImageUrl } from "@/modules/platform/domain/vietqr-billing"
import type { BillingAccount } from "../infra/billing-account-store"

/** Hoá đơn kèm mã VietQR khi nền tảng đã khai tài khoản nhận tiền; nội dung chuyển khoản = mã hoá đơn. */
export interface InvoiceView {
  id: string
  code: string
  periodStart: string
  periodEnd: string
  amountVnd: number
  status: string
  dueAt: string
  paidAt: string | null
  payment: { bankName: string; accountNumber: string; accountHolder: string; transferContent: string; qrImageUrl: string } | null
}

export function invoiceView(
  i: { id: string; code: string; period_start: Date; period_end: Date; amount_vnd: number; status: string; due_at: Date; paid_at: Date | null },
  account: BillingAccount | null,
): InvoiceView {
  return {
    id: i.id, code: i.code, periodStart: i.period_start.toISOString(), periodEnd: i.period_end.toISOString(), amountVnd: i.amount_vnd,
    status: i.status, dueAt: i.due_at.toISOString(), paidAt: i.paid_at?.toISOString() ?? null,
    payment: account && i.status === "PENDING"
      ? {
          bankName: account.bankName, accountNumber: account.accountNumber, accountHolder: account.accountHolder, transferContent: i.code,
          qrImageUrl: buildVietQrImageUrl(account.bankBin, account.accountNumber, i.amount_vnd, i.code, account.accountHolder),
        }
      : null,
  }
}
