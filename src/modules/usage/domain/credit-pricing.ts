/**
 * Cấu hình quy đổi credit cấp nền tảng (PO Q10, checklist ALG 10.3, 10.4) — khoá `platform_settings.credit_pricing`,
 * Console sửa. SMS/ZNS mặc định 0 credit/tin: tin nhắn đang gửi bằng tài khoản nhà mạng của chính cửa hàng,
 * nền tảng chỉ thu khi Console đặt tỷ lệ.
 */

export interface CreditPricing {
  /** Credit trừ cho mỗi tin SMS cửa hàng gửi khách */
  smsCredit: number
  /** Credit trừ cho mỗi tin Zalo ZNS */
  znsCredit: number
  /** Tỷ giá USD → VND để quy đổi chi phí nhà cung cấp (10.4) */
  usdToVnd: number
  /** Giá trị 1 credit theo VND để tính biên lợi nhuận (10.4) */
  creditValueVnd: number
  /** Giá vốn tham chiếu mỗi tin SMS / ZNS (VND) — ghi `provider_cost_entries` (10.4) */
  smsCostVnd: number
  znsCostVnd: number
  /** Hạn mức credit/tháng mặc định cho tổ chức chưa đặt riêng; null = không giới hạn */
  defaultMonthlyLimit: number | null
  /** Tin nhắn gửi khách vẫn đi khi hết credit, số dư được âm tối đa chừng này credit (PO 05/11/2026); 0 = không thấu chi */
  messageOverdraftCredit: number
  /** Credit cho mỗi phương án "Tạo thêm" ở Bộ nhận diện / Landing page của mục Thương hiệu (PO 08/11/2026); 3 phương án đầu miễn phí */
  brandExtraOptionCredit: number
}

export const DEFAULT_CREDIT_PRICING: CreditPricing = {
  smsCredit: 0, znsCredit: 0, usdToVnd: 25_000, creditValueVnd: 1_000, smsCostVnd: 0, znsCostVnd: 0, defaultMonthlyLimit: null,
  messageOverdraftCredit: 50,
  brandExtraOptionCredit: 1,
}

const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined

/** Đọc giá trị đã lưu; trường thiếu/sai lấy mặc định. */
export function parseCreditPricing(raw: unknown): CreditPricing {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const limit = r.defaultMonthlyLimit
  return {
    smsCredit: Math.round(num(r.smsCredit, 0, 1000) ?? DEFAULT_CREDIT_PRICING.smsCredit),
    znsCredit: Math.round(num(r.znsCredit, 0, 1000) ?? DEFAULT_CREDIT_PRICING.znsCredit),
    usdToVnd: num(r.usdToVnd, 1000, 100_000) ?? DEFAULT_CREDIT_PRICING.usdToVnd,
    creditValueVnd: num(r.creditValueVnd, 1, 1_000_000) ?? DEFAULT_CREDIT_PRICING.creditValueVnd,
    smsCostVnd: Math.round(num(r.smsCostVnd, 0, 100_000) ?? DEFAULT_CREDIT_PRICING.smsCostVnd),
    znsCostVnd: Math.round(num(r.znsCostVnd, 0, 100_000) ?? DEFAULT_CREDIT_PRICING.znsCostVnd),
    defaultMonthlyLimit: limit === null ? null : (num(limit, 0, 10_000_000) !== undefined ? Math.round(limit as number) : null),
    messageOverdraftCredit: Math.round(num(r.messageOverdraftCredit, 0, 100_000) ?? DEFAULT_CREDIT_PRICING.messageOverdraftCredit),
    brandExtraOptionCredit: Math.round(num(r.brandExtraOptionCredit, 0, 1000) ?? DEFAULT_CREDIT_PRICING.brandExtraOptionCredit),
  }
}

/** Lỗi khi lưu (giá trị ngoài khoảng cho phép); `null` = hợp lệ. */
export function creditPricingProblem(input: Record<string, unknown>): string | null {
  if (input.smsCredit !== undefined && (num(input.smsCredit, 0, 1000) === undefined || !Number.isInteger(input.smsCredit))) return "Credit mỗi tin SMS là số nguyên 0–1.000"
  if (input.znsCredit !== undefined && (num(input.znsCredit, 0, 1000) === undefined || !Number.isInteger(input.znsCredit))) return "Credit mỗi tin ZNS là số nguyên 0–1.000"
  if (input.usdToVnd !== undefined && num(input.usdToVnd, 1000, 100_000) === undefined) return "Tỷ giá USD→VND trong khoảng 1.000–100.000"
  if (input.creditValueVnd !== undefined && num(input.creditValueVnd, 1, 1_000_000) === undefined) return "Giá trị 1 credit trong khoảng 1–1.000.000đ"
  for (const k of ["smsCostVnd", "znsCostVnd"] as const) {
    if (input[k] !== undefined && num(input[k], 0, 100_000) === undefined) return "Giá vốn mỗi tin trong khoảng 0–100.000đ"
  }
  const o = input.messageOverdraftCredit
  if (o !== undefined && (num(o, 0, 100_000) === undefined || !Number.isInteger(o))) return "Mức thấu chi tin nhắn là số nguyên 0–100.000"
  const be = input.brandExtraOptionCredit
  if (be !== undefined && (num(be, 0, 1000) === undefined || !Number.isInteger(be))) return "Credit mỗi phương án tạo thêm là số nguyên 0–1.000"
  const l = input.defaultMonthlyLimit
  if (l !== undefined && l !== null && (num(l, 0, 10_000_000) === undefined || !Number.isInteger(l))) return "Hạn mức mặc định là số nguyên 0–10.000.000 hoặc bỏ trống"
  return null
}
