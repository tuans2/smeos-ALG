/**
 * Gợi ý điền form sản phẩm từ kết quả phân tích ảnh (Vision AI).
 * AI CHỈ điền các trường mô tả hoa và CHỈ khi trường còn trống, người dùng chưa gõ:
 * không bao giờ đụng Mã, Giá, Ảnh, Trạng thái (quyết định PO 06/10/2026).
 */

export const AI_FIELDS = ["name", "category", "occasion", "components", "colors", "style", "packaging", "description"] as const
export type AiField = (typeof AI_FIELDS)[number]
export type AiFieldValues = Record<AiField, string>

export const CATEGORY_OPTIONS = ["Bó hoa tươi", "Giỏ hoa để bàn", "Bình hoa nghệ thuật", "Lẵng hoa chúc mừng"] as const

export interface VisionResult {
  productName?: string
  components?: Array<{ flowerType: string; quantityEstimate?: number; unit?: string }>
  attributes?: { mainColors?: string[]; secondaryColors?: string[]; style?: string; shape?: string }
  packaging?: { wrappingMaterial?: string; wrappingColor?: string; ribbon?: string }
  context?: { likelyOccasions?: string[] }
}

function categoryOf(text: string): string {
  const t = text.toLowerCase()
  if (t.includes("giỏ")) return "Giỏ hoa để bàn"
  if (t.includes("bình")) return "Bình hoa nghệ thuật"
  if (t.includes("lẵng") || t.includes("kệ")) return "Lẵng hoa chúc mừng"
  if (t.includes("bó")) return "Bó hoa tươi"
  return ""
}

const join = (parts: Array<string | undefined>) => parts.map((p) => p?.trim()).filter(Boolean).join(", ")

/** Giá trị AI đề xuất cho từng trường (chuỗi rỗng = AI không biết). */
export function visionToFields(v: VisionResult): AiFieldValues {
  const components = join((v.components ?? []).map((c) =>
    c.quantityEstimate ? `${c.flowerType} (~${c.quantityEstimate} ${c.unit ?? "cành"})` : c.flowerType
  ))
  const colors = join([...(v.attributes?.mainColors ?? []), ...(v.attributes?.secondaryColors ?? [])])
  const style = v.attributes?.style?.trim() ?? ""
  const packaging = join([v.packaging?.wrappingMaterial, v.packaging?.wrappingColor, v.packaging?.ribbon])
  const description = [
    components && `Gồm ${components}.`,
    colors && `Tông màu ${colors}.`,
    style && `Phong cách ${style.toLowerCase()}.`,
    packaging && `Gói ${packaging}.`,
  ].filter(Boolean).join(" ")
  return {
    name: v.productName?.trim() ?? "",
    category: categoryOf(`${v.attributes?.shape ?? ""} ${v.productName ?? ""}`),
    occasion: v.context?.likelyOccasions?.[0]?.trim() ?? "",
    components,
    colors,
    style,
    packaging,
    description,
  }
}

/** Chỉ các trường đang trống và người dùng chưa sửa tay; trường AI không biết thì bỏ qua. */
export function fillEmptyFields(current: AiFieldValues, suggested: AiFieldValues, touched: ReadonlySet<AiField>): Partial<AiFieldValues> {
  const patch: Partial<AiFieldValues> = {}
  for (const f of AI_FIELDS) {
    if (touched.has(f) || current[f].trim() || !suggested[f]) continue
    patch[f] = suggested[f]
  }
  return patch
}
