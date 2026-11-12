/**
 * Tiền công đối tác — một nguồn (PO 12/11/2026, audit BL-22). Luật thuần.
 * - Số chuẩn của một đơn = phí gia công lúc chi nhánh nhận đơn trừ các khoản khấu trừ (`subcontract_dispatch.craftFee`);
 *   đơn không qua giao chi nhánh → tiền công đã thoả thuận lúc giao xưởng (`order_coordinations.partner_payout_vnd`).
 * - Đóng đơn tự điền số chuẩn; sửa khác số chuẩn phải ghi lý do. Trước đây ô nhập tay không có căn cứ, để trống thì
 *   xoá luôn số đã thoả thuận.
 * - Sổ quyết toán theo kỳ: Chờ đối soát → Đã đối soát → Đã thanh toán; kỳ của một đối tác không chồng nhau.
 */

export const PAYOUT_REASON_MIN_LENGTH = 5
export const MAX_SETTLEMENT_DAYS = 92

export const SETTLEMENT_STATUSES = ["PENDING", "RECONCILED", "PAID"] as const
export type SettlementStatusCode = (typeof SETTLEMENT_STATUSES)[number]
export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatusCode, string> = {
  PENDING: "Chờ đối soát",
  RECONCILED: "Đã đối soát",
  PAID: "Đã thanh toán",
}

const fmt = (vnd: number) => `${vnd.toLocaleString("vi-VN")}đ`

/** Số chuẩn: phí gia công còn được trả (đã trừ khấu trừ) nếu có, không thì tiền công đã thoả thuận. */
export function referencePayoutVnd(input: { craftFeePayableVnd: number | null; agreedVnd: number | null }): number | null {
  return input.craftFeePayableVnd ?? input.agreedVnd
}

export type ClosurePayout = { payoutVnd: number | null; overrideReason: string | null }

/** Tiền công ghi khi đóng đơn; trả câu lỗi (tiếng Việt) khi sửa khác số chuẩn mà không ghi lý do. */
export function resolveClosurePayout(input: { referenceVnd: number | null; inputVnd: number | undefined; reason: string | undefined }): ClosurePayout | string {
  const { referenceVnd, inputVnd } = input
  if (inputVnd === undefined || inputVnd === referenceVnd) return { payoutVnd: inputVnd ?? referenceVnd, overrideReason: null }
  if (referenceVnd === null) return { payoutVnd: inputVnd, overrideReason: null }
  const reason = input.reason?.trim() ?? ""
  if (reason.length < PAYOUT_REASON_MIN_LENGTH) return `Tiền công khác số đã chốt (${fmt(referenceVnd)}) — ghi lý do điều chỉnh`
  return { payoutVnd: inputVnd, overrideReason: reason.slice(0, 500) }
}

export interface StatementLine {
  orderId: string
  code: string
  closedAt: string
  payoutVnd: number | null
}

export function summarizeStatement(lines: readonly StatementLine[]) {
  let totalPayoutVnd = 0
  let missingPayoutCount = 0
  for (const l of lines) {
    if (l.payoutVnd === null) missingPayoutCount++
    else totalPayoutVnd += l.payoutVnd
  }
  return { orderCount: lines.length, totalPayoutVnd, missingPayoutCount }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

/** Kỳ theo ngày Việt Nam (gồm hai đầu) → mốc giờ [start, endExclusive); sai định dạng, ngược hoặc quá 92 ngày → câu lỗi. */
export function settlementRange(from: string, to: string): { start: Date; endExclusive: Date } | string {
  if (!DATE.test(from) || !DATE.test(to)) return "Kỳ đối soát cần ngày dạng YYYY-MM-DD"
  const start = new Date(`${from}T00:00:00+07:00`)
  const endExclusive = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + DAY_MS)
  if (Number.isNaN(start.getTime()) || Number.isNaN(endExclusive.getTime())) return "Ngày không hợp lệ"
  if (endExclusive <= start) return "Ngày cuối kỳ phải sau ngày đầu kỳ"
  if (endExclusive.getTime() - start.getTime() > MAX_SETTLEMENT_DAYS * DAY_MS) return `Một kỳ tối đa ${MAX_SETTLEMENT_DAYS} ngày`
  return { start, endExclusive }
}

/** Hai kỳ (ngày, gồm hai đầu, dạng YYYY-MM-DD) có chung ít nhất một ngày. */
export function periodsOverlap(a: { from: string; to: string }, b: { from: string; to: string }): boolean {
  return a.from <= b.to && b.from <= a.to
}

export type SettlementAction = "RECONCILE" | "PAY"

/** Bước kế tiếp của sổ quyết toán; sai thứ tự → câu lỗi. */
export function nextSettlementStatus(status: string, action: SettlementAction): SettlementStatusCode | string {
  if (action === "RECONCILE") return status === "PENDING" ? "RECONCILED" : "Chỉ đối soát được sổ đang chờ đối soát"
  return status === "RECONCILED" ? "PAID" : "Cần đối soát xong trước khi ghi đã thanh toán"
}
