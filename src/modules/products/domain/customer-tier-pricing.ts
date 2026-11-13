/**
 * Chiết khấu theo hạng khách và phụ phí giờ cao điểm (checklist ALG 3.1) — luật thuần.
 *
 * `customer_tier_discount`: tỷ lệ giảm trên tiền hàng theo hạng khách (enum `customer_tier`), mặc định 0
 * mọi hạng — cửa hàng tự bật. `peak_hour_surcharge`: danh sách khung giờ giao (giờ bắt đầu ≤ giờ giao <
 * giờ kết thúc) với phụ phí cố định, mặc định rỗng. Cả hai áp khi báo giá có khách/khung giờ xác định và
 * hiện thành dòng riêng.
 */

export const CUSTOMER_TIERS = ["NEW", "BRONZE", "SILVER", "GOLD", "VIP"] as const
export type CustomerTier = (typeof CUSTOMER_TIERS)[number]

export const CUSTOMER_TIER_LABEL: Record<CustomerTier, string> = {
  NEW: "Khách mới", BRONZE: "Đồng", SILVER: "Bạc", GOLD: "Vàng", VIP: "VIP",
}

export type CustomerTierDiscount = Record<CustomerTier, number>

export const DEFAULT_CUSTOMER_TIER_DISCOUNT: CustomerTierDiscount = { NEW: 0, BRONZE: 0, SILVER: 0, GOLD: 0, VIP: 0 }
export const MAX_TIER_DISCOUNT_RATIO = 0.5

export interface PeakHourWindow {
  startHour: number
  endHour: number
  vnd: number
  label: string
}

export const MAX_PEAK_HOUR_SURCHARGE_VND = 5_000_000

export function isCustomerTier(v: unknown): v is CustomerTier {
  return typeof v === "string" && (CUSTOMER_TIERS as readonly string[]).includes(v)
}

/** Đọc `customer_tier_discount` đã lưu; thiếu hoặc sai → 0 cho hạng đó. */
export function parseTierDiscount(raw: unknown): CustomerTierDiscount {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const out = { ...DEFAULT_CUSTOMER_TIER_DISCOUNT }
  for (const t of CUSTOMER_TIERS) {
    const v = obj[t]
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_TIER_DISCOUNT_RATIO) out[t] = v
  }
  return out
}

export function parsePeakHours(raw: unknown): PeakHourWindow[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((w) => {
    const r = w && typeof w === "object" ? (w as Record<string, unknown>) : {}
    const s = Number(r.startHour), e = Number(r.endHour), v = Number(r.vnd)
    if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e > 24 || s >= e) return []
    if (!Number.isFinite(v) || v <= 0 || v > MAX_PEAK_HOUR_SURCHARGE_VND) return []
    return [{ startHour: s, endHour: e, vnd: Math.round(v), label: typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 60) : `Giờ cao điểm ${s}h–${e}h` }]
  })
}

/** Giờ bắt đầu của khung giờ giao ("08:00 - 10:00" → 8); `null` khi không đọc được. */
export function slotStartHour(timeSlot: string | null | undefined): number | null {
  const m = /(\d{1,2})\s*[:h]\s*\d{0,2}/.exec(timeSlot ?? "")
  const h = m ? Number(m[1]) : NaN
  return Number.isInteger(h) && h >= 0 && h < 24 ? h : null
}

export function peakHourSurchargeFor(windows: readonly PeakHourWindow[], timeSlot: string | null | undefined): PeakHourWindow | null {
  const h = slotStartHour(timeSlot)
  if (h === null) return null
  return windows.find((w) => h >= w.startHour && h < w.endHour) ?? null
}

/** Số tiền giảm theo hạng trên tiền hàng, làm tròn nghìn đồng. */
export function tierDiscountVnd(merchandiseVnd: number, ratio: number): number {
  return Math.max(0, Math.round((merchandiseVnd * ratio) / 1000) * 1000)
}
