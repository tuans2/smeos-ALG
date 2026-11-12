import { bucketOf, bucketsOf, type ReportPeriod } from "./report-period"
import type { BankEventRow, PaymentRow } from "./report-rows"

/**
 * Dòng tiền (6.6) — luật thuần. Theo hình thức thu: tổng thu, hoàn, thực thu. Theo ngày: thu chuyển khoản trong sổ
 * so với giao dịch ngân hàng nhận qua SePay — đã khớp đơn, chưa khớp, bỏ qua; chênh lệch = sổ chuyển khoản − ngân
 * hàng đã khớp. Khoản chưa khớp liệt kê để kế toán xử lý.
 */

export const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Chuyển khoản / VietQR", CASH: "Tiền mặt", CARD: "Thẻ", E_WALLET: "Ví điện tử", COD: "Thu hộ khi giao", MARKETPLACE: "Sàn thương mại điện tử", OTHER: "Khác",
}

const methodOf = (m: string | null) => (m && m in METHOD_LABEL ? m : "OTHER")

export function buildCashflowReport(payments: PaymentRow[], bank: BankEventRow[], p: ReportPeriod) {
  const byMethod = new Map<string, { method: string; label: string; collectedVnd: number; refundedVnd: number }>()
  for (const pay of payments) {
    const m = methodOf(pay.method)
    const row = byMethod.get(m) ?? { method: m, label: METHOD_LABEL[m]!, collectedVnd: 0, refundedVnd: 0 }
    if (pay.kind === "REFUND") row.refundedVnd += pay.amountVnd
    else row.collectedVnd += pay.amountVnd
    byMethod.set(m, row)
  }
  const days = new Map(bucketsOf({ ...p, granularity: "day" }).map((d) => [d, {
    date: d, ledgerTransferVnd: 0, bankMatchedVnd: 0, bankUnmatchedVnd: 0, bankIgnoredVnd: 0, unmatchedCount: 0, differenceVnd: 0,
  }]))
  for (const pay of payments) {
    if (pay.kind === "REFUND" || methodOf(pay.method) !== "BANK_TRANSFER") continue
    const d = days.get(bucketOf(pay.collectedAt, "day"))
    if (d) d.ledgerTransferVnd += pay.amountVnd
  }
  for (const e of bank) {
    const d = days.get(bucketOf(e.at, "day"))
    if (!d) continue
    if (e.status === "MATCHED") d.bankMatchedVnd += e.amountVnd
    else if (e.status === "IGNORED") d.bankIgnoredVnd += e.amountVnd
    else { d.bankUnmatchedVnd += e.amountVnd; d.unmatchedCount++ }
  }
  for (const d of days.values()) d.differenceVnd = d.ledgerTransferVnd - d.bankMatchedVnd
  const unmatched = bank
    .filter((e) => e.status !== "MATCHED" && e.status !== "IGNORED")
    .slice(0, 50)
    .map((e) => ({ id: e.id, at: e.at.toISOString(), amountVnd: e.amountVnd, content: e.content.slice(0, 160) }))
  return {
    byMethod: [...byMethod.values()].map((r) => ({ ...r, netVnd: r.collectedVnd - r.refundedVnd })).sort((a, b) => b.netVnd - a.netVnd),
    daily: [...days.values()],
    unmatched,
  }
}
