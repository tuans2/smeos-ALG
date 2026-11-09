/**
 * Thẻ chào sản phẩm (tư vấn bán hàng — KHÔNG phải thiệp greeting-card) đã chốt, lưu trong
 * `products.attributes.sales_pitch` (PO 08/11/2026: lưu Kho sản phẩm, không đổi schema). Trước đây thẻ đã chốt
 * chỉ nằm ở localStorage của trình duyệt. Thuần — không import hạ tầng.
 *
 * Hình dạng lưu và hình dạng trên API là snake_case (chuẩn API Contract v1.1); `SalesPitchData` của giao diện
 * là camelCase — đổi qua `pitchToRecord` / `toSalesPitchData`. Không lưu `imageUrl`: đó là link ký có hạn —
 * khi đọc, nơi gọi gắn ảnh mới ký từ bản phân tích.
 */
import { z } from "zod"

import type { SalesPitchData, SalesPitchItem } from "./sales-pitch-template"

export const SALES_PITCH_ATTRIBUTE_KEY = "sales_pitch"

/** Trần kích thước bản lưu — chặn ghi rác vào cột JSON của sản phẩm. */
export const MAX_SALES_PITCH_BYTES = 32 * 1024

const text = (max: number) => z.string().max(max)
const nullableText = (max: number) => z.string().max(max).nullable()
const list = (max: number) => z.array(text(200)).max(max)
const vnd = z.number().int().nonnegative().max(10_000_000_000).nullable()
const cm = z.number().nonnegative().max(1000).nullable()

const pitchItem = z.object({
  name: text(120),
  quantity: z.union([z.number(), z.string().max(40), z.null()]),
  unit: text(40),
  color: nullableText(80),
  role: nullableText(80),
})

/** Thẻ chào trên API và trong CSDL — kiểm chặt từng trường, bỏ trường lạ. */
export const salesPitchRecord = z.object({
  product_name: z.string().trim().min(1, "Cần tên sản phẩm").max(160),
  sku: nullableText(60),
  style: text(160),
  occasions: list(20),
  occasion_register: z.enum(["FESTIVE", "NEUTRAL", "SOLEMN"]),
  description: text(4000),
  main_items: z.array(pitchItem).max(40),
  foliage_items: z.array(pitchItem).max(40),
  accessory_items: z.array(pitchItem).max(40),
  wrapping: text(400),
  container: text(200),
  height_cm: cm,
  width_cm: cm,
  price_vnd: vnd,
  original_price_vnd: vnd,
  price_segment: text(60),
  free_gifts: list(20),
  guarantees: list(20),
  shop_name: nullableText(160),
  shop_hotline: nullableText(40),
  custom_note: nullableText(1000),
  cta_phrase: nullableText(300),
  greeting_line: nullableText(300),
})

export type SalesPitchRecord = z.infer<typeof salesPitchRecord>

export interface StoredSalesPitch {
  readonly data: SalesPitchRecord
  readonly finalized_at: string
  readonly finalized_by: string
  /** Tăng mỗi lần chốt lại */
  readonly version: number
}

const stored = z.object({
  data: salesPitchRecord,
  finalized_at: z.string(),
  finalized_by: z.string(),
  version: z.number().int().positive(),
})

/** Đọc thẻ đã lưu; dữ liệu hỏng/thiếu → `null` (coi như chưa chốt), không ném. */
export function readSalesPitch(attributes: unknown): StoredSalesPitch | null {
  if (!attributes || typeof attributes !== "object") return null
  const parsed = stored.safeParse((attributes as Record<string, unknown>)[SALES_PITCH_ATTRIBUTE_KEY])
  return parsed.success ? parsed.data : null
}

/** Gộp thẻ vào `attributes` — giữ nguyên mọi khoá khác (BOM, dữ liệu bán hàng, đề xuất…). */
export function withSalesPitch(
  attributes: Record<string, unknown> | null,
  pitch: SalesPitchRecord,
  meta: { userId: string; at: Date },
): Record<string, unknown> {
  const base = attributes ?? {}
  const prev = readSalesPitch(base)
  const record: StoredSalesPitch = {
    data: pitch,
    finalized_at: meta.at.toISOString(),
    finalized_by: meta.userId,
    version: (prev?.version ?? 0) + 1,
  }
  return { ...base, [SALES_PITCH_ATTRIBUTE_KEY]: record }
}

export function salesPitchTooLarge(pitch: SalesPitchRecord): boolean {
  return new TextEncoder().encode(JSON.stringify(pitch)).length > MAX_SALES_PITCH_BYTES
}

const toRecordItem = (i: SalesPitchItem) => ({ name: i.name, quantity: i.quantity, unit: i.unit, color: i.color ?? null, role: i.role ?? null })
const toItem = (i: SalesPitchRecord["main_items"][number], key: string, n: number): SalesPitchItem => ({ ...i, id: `${key}-${n}` })
const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null)

/** Dữ liệu giao diện → bản lưu (gửi lên API). */
export function pitchToRecord(p: SalesPitchData): SalesPitchRecord {
  return {
    product_name: p.productName,
    sku: p.sku ?? null,
    style: p.style,
    occasions: p.occasions,
    occasion_register: p.occasionRegister,
    description: p.description,
    main_items: p.mainFlowers.map(toRecordItem),
    foliage_items: p.foliageItems.map(toRecordItem),
    accessory_items: p.accessoryItems.map(toRecordItem),
    wrapping: p.wrapping,
    container: p.container,
    height_cm: num(p.dimensions.heightCm),
    width_cm: num(p.dimensions.widthCm),
    price_vnd: num(p.priceVnd),
    original_price_vnd: num(p.originalPriceVnd),
    price_segment: p.priceSegment,
    free_gifts: p.freeGifts,
    guarantees: p.guarantees,
    shop_name: p.shopName ?? null,
    shop_hotline: p.shopHotline ?? null,
    custom_note: p.customNote ?? null,
    cta_phrase: p.ctaPhrase ?? null,
    greeting_line: p.greetingLine ?? null,
  }
}

/** Thẻ đã lưu → dữ liệu hiển thị (`SalesPitchCard`), gắn ảnh mới ký và trạng thái đã chốt. */
export function toSalesPitchData(s: StoredSalesPitch, ids: { productId: string; analysisId: string | null; imageUrl: string | null }): SalesPitchData {
  const d = s.data
  return {
    id: ids.productId,
    productId: ids.productId,
    analysisId: ids.analysisId,
    imageUrl: ids.imageUrl,
    productName: d.product_name,
    sku: d.sku,
    style: d.style,
    occasions: d.occasions,
    occasionRegister: d.occasion_register,
    description: d.description,
    mainFlowers: d.main_items.map((i, n) => toItem(i, "main", n)),
    foliageItems: d.foliage_items.map((i, n) => toItem(i, "foliage", n)),
    accessoryItems: d.accessory_items.map((i, n) => toItem(i, "accessory", n)),
    wrapping: d.wrapping,
    container: d.container,
    dimensions: { heightCm: d.height_cm, widthCm: d.width_cm },
    priceVnd: d.price_vnd,
    originalPriceVnd: d.original_price_vnd,
    priceSegment: d.price_segment,
    freeGifts: d.free_gifts,
    guarantees: d.guarantees,
    shopName: d.shop_name,
    shopHotline: d.shop_hotline,
    customNote: d.custom_note,
    ctaPhrase: d.cta_phrase,
    greetingLine: d.greeting_line,
    status: "FINALIZED",
    finalizedAt: s.finalized_at,
    updatedAt: s.finalized_at,
  }
}
