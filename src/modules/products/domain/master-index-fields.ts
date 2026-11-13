/**
 * Quy tắc đọc từng trường của Product Master Index từ dữ liệu thô (cột `products`,
 * `products.attributes`, bản phân tích APPROVED mới nhất). Hàm thuần — không Prisma.
 *
 * Dùng chung cho `ProductMasterIndexRepository` (trang nội bộ) và các phép chiếu
 * công khai (Thẻ chào), để cùng một sản phẩm luôn ra cùng giá trị ở mọi nơi.
 */
import { toneChuDao } from "@/modules/product-copies/domain/analysis-projection"
import { mauChuDao } from "./product-analysis-rules"
import { mergeOccasions } from "./product-master-index"

type Json = Record<string, unknown>

const asObject = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {})
const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** Nguồn thô của một sản phẩm, đúng như Master Index đọc. */
export interface MasterIndexSource {
  category: string | null
  attributes: unknown
  /** `edited ?? raw` của lượt phân tích APPROVED mới nhất, nếu có */
  analysis: unknown
}

function parts(src: MasterIndexSource) {
  const attrs = asObject(src.attributes)
  const analysis = asObject(src.analysis)
  return { attrs, analysis, identity: asObject(analysis.identity), bom: asObject(analysis.bom), attrsBom: asObject(attrs.bom) }
}

export function readStyle(src: MasterIndexSource): string | null {
  const v = parts(src).identity.phong_cach
  return typeof v === "string" && v.trim() ? v.trim() : null
}

export function readOccasions(src: MasterIndexSource): string[] {
  const { attrs, identity } = parts(src)
  const sales = asObject(attrs.salesData).occasions
  return mergeOccasions(
    Array.isArray(sales) ? sales.map(String) : undefined,
    identity.dip_su_dung ? String(identity.dip_su_dung) : undefined,
  )
}

export function readPrimaryColor(src: MasterIndexSource): string | null {
  const { attrs, analysis } = parts(src)
  const tone = toneChuDao(analysis)[0]
  const fromAttrs = typeof attrs.color === "string" && attrs.color ? attrs.color : null
  return tone ?? fromAttrs ?? mauChuDao(analysis) ?? null
}

import { extractComponentNames, normalizeProductBom } from "./bom"

/** Tên các thành phần / loại hoa trong công thức (BOM), theo thứ tự, không trùng. */
export function readFlowerNames(src: MasterIndexSource): string[] {
  const { bom, attrsBom } = parts(src)
  const targetBom = bom && Object.keys(bom).length > 0 ? bom : attrsBom
  return extractComponentNames(targetBom)
}

/** Tên tổng quát cho Master Index đa ngành */
export const readComponentNames = readFlowerNames

interface WrapLayer { layer?: string | null; material?: string | null; color?: string | null }

/** Kiểu gói lớp ngoài; `null` khi chưa rõ (Master Index hiển thị "Chưa rõ kiểu gói"). */
export function readWrapStyle(src: MasterIndexSource): string | null {
  const { attrs, bom, attrsBom } = parts(src)
  const layers = asArray<WrapLayer>(bom.wrapping ?? attrsBom.wrapping)
  const outer = layers.find((w) => w.layer === "Lớp ngoài") ?? layers[0]
  if (outer) return [outer.material, outer.color].filter(Boolean).join(" ") || null
  return typeof attrs.wrapStyle === "string" && attrs.wrapStyle ? attrs.wrapStyle : null
}

/** Kích thước chỉ khi đã nhập số thật — không bịa mặc định. */
export function readDimensions(src: MasterIndexSource): { heightCm: number; widthCm: number } | null {
  const d = asObject(parts(src).attrs.dimensions)
  return typeof d.heightCm === "number" && typeof d.widthCm === "number" ? { heightCm: d.heightCm, widthCm: d.widthCm } : null
}

/** Các bước cắm/lắp ráp tham khảo cho thợ — chỉ khi người quản lý mẫu đã nhập tay, không bịa quy trình. */
export function readAssemblySteps(src: MasterIndexSource): string[] | null {
  const steps = asArray<unknown>(parts(src).attrs.assemblySteps)
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
  return steps.length > 0 ? steps : null
}

export function readDescription(src: MasterIndexSource): string | null {
  const v = parts(src).attrs.description
  return typeof v === "string" && v.trim() ? v.trim() : null
}
