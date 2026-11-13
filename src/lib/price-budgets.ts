/**
 * Khoảng giá lọc nhanh sản phẩm — mỗi cửa hàng tự đặt (Điều hành, mục "Bán hàng"
 * trong Hồ sơ tổ chức). Lưu ở `organizations.settings[PRICE_BUDGETS_SETTINGS_KEY]`.
 *
 * Quy ước: khoảng là nửa mở `min ≤ giá < max`; `max = null` = không giới hạn trên.
 * Nhờ vậy 600k chỉ rơi vào "600k - <800k", không đồng thời thuộc khoảng trước.
 *
 * Tệp thuần: không import Prisma/React, test không cần cơ sở dữ liệu.
 */

export const PRICE_BUDGETS_SETTINGS_KEY = "khoang_gia_loc_nhanh" as const
export const MAX_PRICE_BUDGETS = 8

export interface PriceBudget {
  id: string
  label: string
  min: number
  max: number | null
}

/** Bộ mặc định — giữ đúng các khung đang dùng trước khi có cấu hình. */
export const DEFAULT_PRICE_BUDGETS: readonly PriceBudget[] = [
  { id: "b1", label: "Dưới 500k", min: 0, max: 500_000 },
  { id: "b2", label: "500k - 800k", min: 500_000, max: 800_000 },
  { id: "b3", label: "800k - 1.5tr", min: 800_000, max: 1_500_000 },
  { id: "b4", label: "Trên 1.5tr", min: 1_500_000, max: null },
]

/** 400000 → "400k", 1500000 → "1tr5", 2000000 → "2tr". */
export function formatPriceShort(vnd: number): string {
  if (vnd >= 1_000_000) {
    const tr = Math.floor(vnd / 1_000_000)
    const rest = Math.round((vnd % 1_000_000) / 1_000)
    if (rest === 0) return `${tr}tr`
    return rest % 100 === 0 ? `${tr}tr${rest / 100}` : `${tr}tr${rest}k`
  }
  return `${Math.round(vnd / 1_000)}k`
}

/** Nhãn tự sinh khi chủ cửa hàng để trống. */
export function defaultBudgetLabel(min: number, max: number | null): string {
  if (max === null) return `Từ ${formatPriceShort(min)}`
  if (min <= 0) return `Dưới ${formatPriceShort(max)}`
  return `${formatPriceShort(min)} - <${formatPriceShort(max)}`
}

const isWholeVnd = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0

/** Đọc cấu hình đã lưu; thiếu hoặc hỏng → bộ mặc định. Luôn sắp theo giá tăng dần. */
export function readPriceBudgets(settings: Record<string, unknown> | null | undefined): PriceBudget[] {
  const raw = settings?.[PRICE_BUDGETS_SETTINGS_KEY]
  if (!Array.isArray(raw)) return [...DEFAULT_PRICE_BUDGETS]
  const parsed: PriceBudget[] = []
  for (const item of raw.slice(0, MAX_PRICE_BUDGETS)) {
    if (!item || typeof item !== "object") continue
    const r = item as Record<string, unknown>
    if (!isWholeVnd(r.min)) continue
    const max = r.max === null || r.max === undefined ? null : r.max
    if (max !== null && (!isWholeVnd(max) || max <= r.min)) continue
    const label = typeof r.label === "string" && r.label.trim() ? r.label.trim() : defaultBudgetLabel(r.min, max)
    parsed.push({ id: typeof r.id === "string" && r.id ? r.id : `p${parsed.length + 1}`, label, min: r.min, max })
  }
  if (parsed.length === 0) return [...DEFAULT_PRICE_BUDGETS]
  return parsed.sort((a, b) => a.min - b.min)
}

/** Lỗi hiển thị cho người dùng; rỗng = lưu được. */
export function priceBudgetErrors(budgets: readonly PriceBudget[]): string[] {
  const errors: string[] = []
  if (budgets.length === 0) errors.push("Cần ít nhất một khoảng giá.")
  if (budgets.length > MAX_PRICE_BUDGETS) errors.push(`Tối đa ${MAX_PRICE_BUDGETS} khoảng giá.`)
  budgets.forEach((b, i) => {
    if (!isWholeVnd(b.min)) errors.push(`Khoảng ${i + 1}: giá từ không hợp lệ.`)
    if (b.max !== null && (!isWholeVnd(b.max) || b.max <= b.min)) {
      errors.push(`Khoảng ${i + 1}: giá đến phải lớn hơn giá từ.`)
    }
  })
  const sorted = [...budgets].sort((a, b) => a.min - b.min)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!
    if (prev.max === null || prev.max > sorted[i]!.min) {
      errors.push(`Khoảng "${prev.label || defaultBudgetLabel(prev.min, prev.max)}" chồng lên khoảng kế tiếp.`)
    }
  }
  return errors
}

/** Chuẩn hoá trước khi lưu: sắp xếp, đánh lại id, điền nhãn trống. */
export function serializePriceBudgets(budgets: readonly PriceBudget[]): PriceBudget[] {
  return [...budgets]
    .sort((a, b) => a.min - b.min)
    .map((b, i) => ({
      id: `p${i + 1}`,
      label: b.label.trim() || defaultBudgetLabel(b.min, b.max),
      min: b.min,
      max: b.max,
    }))
}

/** Sinh các khoảng đều nhau: 400k → 1tr5 bước 200k, thêm khoảng "Từ 1tr5" ở cuối. */
export function generatePriceBudgets(from: number, to: number, step: number): PriceBudget[] {
  if (!(step > 0) || !(to > from)) return []
  const out: PriceBudget[] = []
  for (let min = from; min < to && out.length < MAX_PRICE_BUDGETS - 1; min += step) {
    const max = Math.min(min + step, to)
    out.push({ id: `p${out.length + 1}`, label: defaultBudgetLabel(min, max), min, max })
  }
  out.push({ id: `p${out.length + 1}`, label: defaultBudgetLabel(to, null), min: to, max: null })
  return out
}

/**
 * Chuyển sang dạng khung đóng `[min, max]` cho bộ lọc sản phẩm (`matchPriceRange`
 * so sánh `≤ max`). Giá là số nguyên VND nên `max - 1` giữ đúng quy ước `< max`.
 */
export function toInclusiveRange(b: PriceBudget): { min: number; max: number; label: string } {
  return { min: b.min, max: b.max === null ? Number.MAX_SAFE_INTEGER : b.max - 1, label: b.label }
}
