import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import {
  DEFAULT_ENABLED_FIELDS,
  OPTIONAL_DISPLAY_FIELDS,
  getOptionalDisplayFields,
  type OptionalDisplayField,
} from "@/modules/greeting-card/domain/display-fields"

/**
 * NGUỒN DUY NHẤT cho thông tin sản phẩm hiển thị trên mọi mẫu Thẻ chào.
 * - Danh sách trường + nhãn + thứ tự: `OPTIONAL_DISPLAY_FIELDS` (domain/display-fields.ts)
 * - Trường lấy từ đâu trong sản phẩm: `FIELD_VALUE` bên dưới
 * - Bật/tắt theo từng mẫu của cửa hàng: tham số `enabled`
 * Mã mẫu, tên và giá luôn hiển thị.
 */

export function formatVnd(value: number | null): string {
  return value !== null && value > 0 ? `${value.toLocaleString("vi-VN")} ₫` : "Liên hệ"
}

/** Giá hiển thị cho khách theo kiểu giá: "Liên hệ", "Từ … – …" (theo phiên bản/cao điểm) hoặc một giá. */
export function productPriceText(p: Pick<GreetingCatalogProduct, "price" | "priceMode" | "priceMaxVnd" | "priceHidden">): string {
  if (p.priceHidden) return "Liên hệ báo giá"
  if (p.priceMode === "CONTACT") return "Liên hệ"
  if (p.price !== null && p.price > 0 && p.priceMaxVnd != null && p.priceMaxVnd > p.price) {
    return `${formatVnd(p.price)} – ${formatVnd(p.priceMaxVnd)}`
  }
  return formatVnd(p.price)
}

const clean = (v: string | null | undefined): string | null => {
  const t = v?.trim()
  return t ? t : null
}

/** Giá trị của từng trường tuỳ chọn trên sản phẩm thẻ chào (đã lấy từ Master Index). */
const FIELD_VALUE: Record<OptionalDisplayField, (p: GreetingCatalogProduct) => string | null> = {
  flowers: (p) => clean(p.flowersSummary),
  color: (p) => clean(p.color),
  style: (p) => clean(p.style),
  dimensions: (p) => clean(p.dimensions),
  wrapStyle: (p) => clean(p.wrapStyle),
  category: (p) => clean(p.category),
  description: (p) => clean(p.meaning) ?? clean(p.description),
}

/** Các trường ngắn hiện thành nhãn dưới tên mẫu. */
const TAG_FIELDS: OptionalDisplayField[] = ["category", "style", "color"]

export interface ProductDisplay {
  title: string
  code: string
  priceLabel: string
  /** Dòng tóm tắt dưới tên (thành phần hoa) */
  summary: string | null
  tags: string[]
  /** Mô tả / ý nghĩa */
  story: string | null
  /** Bảng thông số (mọi trường đang bật có dữ liệu, trừ mô tả) */
  specs: { label: string; value: string }[]
  ariaLabel: string
}

export function toProductDisplay(
  p: GreetingCatalogProduct,
  enabled: readonly OptionalDisplayField[] = DEFAULT_ENABLED_FIELDS,
  industryKey?: string,
): ProductDisplay {
  const on = new Set(enabled)
  const value = (k: OptionalDisplayField) => (on.has(k) ? FIELD_VALUE[k](p) : null)
  const priceLabel = productPriceText(p)
  const displayFields = getOptionalDisplayFields(industryKey)

  return {
    title: p.name,
    code: p.code,
    priceLabel,
    summary: value("flowers"),
    tags: TAG_FIELDS.map(value).filter((v): v is string => Boolean(v)),
    story: value("description"),
    specs: displayFields
      .filter((f) => on.has(f.key) && f.key !== "description")
      .map((f): { label: string; value: string | null } => ({ label: f.label, value: value(f.key) }))
      .filter((r): r is { label: string; value: string } => r.value !== null),
    ariaLabel: `${p.name}, mã ${p.code}, ${priceLabel}`,
  }
}

/** Dòng so sánh: trường bắt buộc + mọi trường đang bật, cùng thứ tự với bảng thông số. */
export function comparisonRows(
  enabled: readonly OptionalDisplayField[] = DEFAULT_ENABLED_FIELDS,
  industryKey?: string,
) {
  const on = new Set(enabled)
  const displayFields = getOptionalDisplayFields(industryKey)
  return [
    { label: industryKey === "HOMESTAY" ? "Giá phòng / đêm" : "Giá", get: (p: GreetingCatalogProduct) => productPriceText(p) },
    { label: industryKey === "HOMESTAY" ? "Mã phòng" : "Mã mẫu", get: (p: GreetingCatalogProduct) => p.code },
    ...displayFields.filter((f) => on.has(f.key) && f.key !== "description").map((f) => ({
      label: f.label,
      get: (p: GreetingCatalogProduct) => FIELD_VALUE[f.key](p),
    })),
  ]
}
