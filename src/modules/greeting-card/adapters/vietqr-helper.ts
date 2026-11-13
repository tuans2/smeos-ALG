/**
 * VietQR helper for instant QR bank transfer generation.
 * Generates Napas-compatible Quick Link and payload.
 */

import type { BrochurePaymentConfig } from "../domain/brochure-commerce-rules"
import { expectedPayment, type BrochurePaymentPolicy } from "../domain/brochure-payment-policy"
import type { BrochurePaymentInstructions } from "../domain/greeting-card-types"

export interface VietQrConfig {
  bankId: string // e.g. "MB", "VCB", "ICB", "TCB", "ACB"
  accountNo: string // e.g. "0381000523456"
  accountName: string // e.g. "NGUYEN VAN A"
  amount: number
  description: string // e.g. "DH-1037"
}

export function generateVietQrUrl(config: VietQrConfig): string {
  const bank = encodeURIComponent(config.bankId.trim())
  const account = encodeURIComponent(config.accountNo.trim())
  const amount = Math.max(0, Math.round(config.amount))
  const memo = encodeURIComponent(config.description.trim())
  const accountName = encodeURIComponent(config.accountName.trim())

  // Standard img.vietqr.io format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<MEMO>&accountName=<NAME>
  return `https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${amount}&addInfo=${memo}&accountName=${accountName}`
}

/**
 * Dựng hướng dẫn chuyển khoản cho LẦN THU này của một đơn (đủ / cọc / phần
 * còn lại theo chính sách tiệm); `null` khi tiệm chưa cấu hình tài khoản
 * hoặc không còn gì phải thu.
 */
export function buildPaymentInstructions(
  config: BrochurePaymentConfig | null,
  order: { totalVnd: number; paidVnd: number },
  policy: BrochurePaymentPolicy,
  transferMemo: string
): BrochurePaymentInstructions | null {
  const { amountVnd: amount, purpose } = expectedPayment(policy, order.totalVnd, order.paidVnd)
  if (!config || amount <= 0) return null
  return {
    purpose,
    orderTotalVnd: order.totalVnd,
    qrUrl: generateVietQrUrl({
      bankId: config.bankId,
      accountNo: config.accountNo,
      accountName: config.accountName,
      amount,
      description: transferMemo,
    }),
    bankName: config.bankName,
    accountNo: config.accountNo,
    accountName: config.accountName,
    amount,
    transferMemo,
  }
}
