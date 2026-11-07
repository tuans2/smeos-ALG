/**
 * Xin giảm giá theo đơn (PO 06/10/2026): Sale xin, Điều hành duyệt (sửa được mức) hoặc từ chối,
 * kèm ghi chú. Mức tối đa do Điều hành đặt trong Cài đặt (`brochure_discount.max_percent`,
 * mặc định và tối đa = trần nền tảng 50%, PO 07/11/2026). Pure TypeScript.
 */

import { PLATFORM_MAX_DISCOUNT_PERCENT } from "@/modules/organization/domain/governance-decisions"

export const DISCOUNT_SETTINGS_KEY = "brochure_discount"
/**
 * Một trần duy nhất cho mọi khoản giảm (PO 07/11/2026, audit BL-08): mặc định = trần nền tảng 50%; Điều hành
 * đặt thấp hơn được, cao hơn thì bị kẹp về trần nền tảng.
 */
export const DEFAULT_MAX_DISCOUNT_PERCENT = PLATFORM_MAX_DISCOUNT_PERCENT
export type DiscountStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface DiscountAsk {
  /** Xin theo % (1–100) hoặc theo số tiền — đúng một trong hai. */
  percent?: number | undefined
  amountVnd?: number | undefined
}

export interface DiscountPayload extends DiscountAsk {
  status: DiscountStatus
  /** Tổng đơn lúc xin (để tính % và kiểm trần). */
  baseTotalVnd: number
  requestedVnd: number
  approvedVnd?: number | undefined
  decidedBy?: string | undefined
  decidedAt?: string | undefined
  note?: string | undefined
}

export function parseMaxDiscountPercent(settings: unknown): number {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = (root[DISCOUNT_SETTINGS_KEY] as Record<string, unknown> | undefined)?.max_percent
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= 100 ? Math.min(raw, PLATFORM_MAX_DISCOUNT_PERCENT) : DEFAULT_MAX_DISCOUNT_PERCENT
}

/** Số tiền giảm của một yêu cầu (làm tròn xuống tới 1.000đ khi tính theo %). */
export function discountVndOf(ask: DiscountAsk, baseTotalVnd: number): number {
  if (typeof ask.amountVnd === "number") return Math.max(0, Math.round(ask.amountVnd))
  if (typeof ask.percent === "number") return Math.floor((baseTotalVnd * ask.percent) / 100 / 1000) * 1000
  return 0
}

/** Lỗi nghiệp vụ (tiếng Việt) hoặc `null` nếu hợp lệ. Áp cho cả lúc xin lẫn lúc duyệt. */
export function discountError(ask: DiscountAsk, baseTotalVnd: number, maxPercent: number): string | null {
  const hasPercent = typeof ask.percent === "number"
  const hasAmount = typeof ask.amountVnd === "number"
  if (hasPercent === hasAmount) return "Nhập mức giảm theo % hoặc theo số tiền"
  if (baseTotalVnd <= 0) return "Đơn chưa có giá — cần báo giá trước khi xin giảm"
  const vnd = discountVndOf(ask, baseTotalVnd)
  if (vnd <= 0) return "Mức giảm phải lớn hơn 0"
  const cap = Math.floor((baseTotalVnd * maxPercent) / 100)
  if (vnd > cap) return `Vượt mức giảm tối đa ${maxPercent}% (${cap.toLocaleString("vi-VN")}đ) do Điều hành đặt`
  return null
}

export function describeDiscount(p: Pick<DiscountPayload, "percent" | "amountVnd" | "requestedVnd">): string {
  return typeof p.percent === "number"
    ? `${p.percent}% (${p.requestedVnd.toLocaleString("vi-VN")}đ)`
    : `${p.requestedVnd.toLocaleString("vi-VN")}đ`
}
