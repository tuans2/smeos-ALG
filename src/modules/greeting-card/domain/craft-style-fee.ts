/**
 * Phí chế tác theo kiểu dáng (PO Q8, checklist ALG 3.6) — luật thuần.
 *
 * Giá niêm yết của mẫu đã gồm phí chế tác theo kiểu dáng của mẫu. Ngày lễ cửa hàng khai, phần phí đó nhân
 * hệ số: khách trả thêm `phí × (hệ số − 1)` cho mỗi sản phẩm, gộp vào đơn giá (khách thấy một giá); sổ nội
 * bộ ghi tách phí chế tác. Mẫu chưa gắn kiểu dáng, hoặc đã có giá cao điểm riêng → không cộng.
 *
 * Cửa hàng ghi đè trong `organizations.settings`: `craft_style_fees` { [kiểu]: số tiền },
 * `craft_holiday_multiplier` (1–3).
 */

export const CRAFT_STYLE_FEES_KEY = "craft_style_fees"
export const CRAFT_HOLIDAY_MULTIPLIER_KEY = "craft_holiday_multiplier"
export const MAX_CRAFT_STYLE_FEE_VND = 50_000_000
export const MIN_HOLIDAY_MULTIPLIER = 1
export const MAX_HOLIDAY_MULTIPLIER = 3

export interface CraftStyleSpec {
  key: string
  label: string
  defaultVnd: number
}

export interface CraftStyleFee {
  key: string
  label: string
  feeVnd: number
}

/** Ghi vào báo giá/đơn — chỉ cho sổ nội bộ, không hiện thành dòng riêng cho khách. */
export interface CraftFeeBreakdown {
  style: string
  label: string
  feeVnd: number
  multiplier: number
  /** Phần cộng thêm mỗi sản phẩm do ngày lễ (đã gộp vào đơn giá). */
  holidayExtraVnd: number
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

function money(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_CRAFT_STYLE_FEE_VND ? Math.round(v) : null
}

/** Danh sách kiểu dáng của ngành với đơn giá cửa hàng đã sửa (nếu có). */
export function resolveCraftStyles(styles: readonly CraftStyleSpec[] | undefined, settings: unknown): CraftStyleFee[] {
  const overrides = rec(rec(settings)[CRAFT_STYLE_FEES_KEY])
  return (styles ?? []).map((s) => ({ key: s.key, label: s.label, feeVnd: money(overrides[s.key]) ?? s.defaultVnd }))
}

export function resolveHolidayMultiplier(industryDefault: number | undefined, settings: unknown): number {
  const v = rec(settings)[CRAFT_HOLIDAY_MULTIPLIER_KEY]
  const pick = typeof v === "number" && Number.isFinite(v) ? v : industryDefault ?? MIN_HOLIDAY_MULTIPLIER
  return Math.min(MAX_HOLIDAY_MULTIPLIER, Math.max(MIN_HOLIDAY_MULTIPLIER, Math.round(pick * 100) / 100))
}

/** Phần cộng thêm mỗi sản phẩm ngày lễ, làm tròn nghìn đồng. */
export function craftHolidayExtraVnd(feeVnd: number, multiplier: number): number {
  return Math.max(0, Math.round((feeVnd * (multiplier - 1)) / 1000) * 1000)
}

/** Bản ghi phí chế tác cho một sản phẩm; `null` khi mẫu chưa gắn kiểu dáng hợp lệ. */
export function craftFeeFor(
  styleKey: string | null | undefined,
  styles: readonly CraftStyleFee[],
  multiplier: number,
  isHoliday: boolean
): CraftFeeBreakdown | null {
  const style = styleKey ? styles.find((s) => s.key === styleKey) : undefined
  if (!style) return null
  return {
    style: style.key, label: style.label, feeVnd: style.feeVnd, multiplier,
    holidayExtraVnd: isHoliday ? craftHolidayExtraVnd(style.feeVnd, multiplier) : 0,
  }
}
