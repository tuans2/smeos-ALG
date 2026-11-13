import { z } from "zod"

/**
 * Trường bán hàng chuẩn của sản phẩm (PO 30/10/2026, công cụ 53 giai đoạn 5): mã vạch, giá vốn,
 * VAT, khối lượng, thẻ. Giá vốn là dữ liệu giá — chỉ đọc/ghi khi có `L5`, như khối `pricing`.
 */
export interface ProductCommerceFields {
  barcode: string | null
  cost_price_vnd: number | null
  vat_percent: number | null
  weight_grams: number | null
  tags: string[]
}

export const COST_FIELD = "cost_price_vnd"
export const MAX_TAGS = 20
const MAX_TAG_LENGTH = 40

/** Phần body dùng chung cho `POST /products` và `PATCH /products/:id`. */
export const commerceInputShape = {
  barcode: z.string().trim().regex(/^[0-9A-Za-z-]{4,32}$/, "Mã vạch 4–32 ký tự chữ/số").nullable().optional(),
  cost_price_vnd: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  vat_percent: z.number().int().min(0).max(100).nullable().optional(),
  weight_grams: z.number().int().min(0).max(1_000_000).nullable().optional(),
  tags: z.array(z.string()).max(MAX_TAGS * 2).optional(),
}

export type ProductCommerceInput = Partial<ProductCommerceFields>

/** Bỏ khoảng trắng, trùng (không phân biệt hoa-thường), thẻ rỗng; cắt độ dài và số lượng. */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH)
    const key = tag.toLocaleLowerCase("vi")
    if (!tag || seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length === MAX_TAGS) break
  }
  return out
}

/**
 * Gom các khoá có mặt trong body thành input; khoá vắng mặt giữ nguyên giá trị đang lưu.
 * Không có khoá nào → `undefined` (không phải `{}`): `decideEdit` coi mọi khoá có giá trị là sửa nội dung,
 * nên `{}` sẽ chặn nhầm việc tạm ẩn/mở bán mẫu chính thức của người không có `H3`.
 */
export function pickCommerceInput(body: Record<string, unknown>): ProductCommerceInput | undefined {
  const out: ProductCommerceInput = {}
  if (body.barcode !== undefined) out.barcode = (body.barcode as string | null) ?? null
  if (body.cost_price_vnd !== undefined) out.cost_price_vnd = (body.cost_price_vnd as number | null) ?? null
  if (body.vat_percent !== undefined) out.vat_percent = (body.vat_percent as number | null) ?? null
  if (body.weight_grams !== undefined) out.weight_grams = (body.weight_grams as number | null) ?? null
  if (Array.isArray(body.tags)) out.tags = normalizeTags(body.tags as string[])
  return Object.keys(out).length > 0 ? out : undefined
}

export function commerceFromRow(row: Partial<ProductCommerceFields>): ProductCommerceFields {
  return {
    barcode: row.barcode ?? null,
    cost_price_vnd: row.cost_price_vnd ?? null,
    vat_percent: row.vat_percent ?? null,
    weight_grams: row.weight_grams ?? null,
    tags: row.tags ?? [],
  }
}

/** Cắt giá vốn khi không có `L5` — trả kèm tên trường bị cắt cho `redacted_fields`. */
export function redactCommerce(
  fields: ProductCommerceFields,
  canReadPricing: boolean
): { commerce: ProductCommerceFields; redacted: string[] } {
  if (canReadPricing || fields.cost_price_vnd === null) return { commerce: fields, redacted: [] }
  return { commerce: { ...fields, cost_price_vnd: null }, redacted: [COST_FIELD] }
}

/** Bỏ giá vốn khỏi một bản ghi trả về từ POST/PATCH khi người gọi không có `L5`. */
export function stripCostPrice<T extends object>(row: T, canReadPricing: boolean): T {
  if (canReadPricing || !(COST_FIELD in row)) return row
  return { ...row, [COST_FIELD]: null }
}
