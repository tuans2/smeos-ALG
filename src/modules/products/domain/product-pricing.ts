/**
 * Kiểu giá của sản phẩm (PO chốt 22/10/2026), lưu trong `products.attributes.pricing`:
 * - FIXED   — một giá; có thể kèm giá cao điểm.
 * - RANGE   — giá theo phiên bản: mỗi tổ hợp đặc điểm (tối đa 2 nhóm, ví dụ Kích cỡ × Màu)
 *             có giá riêng và giá cao điểm riêng. "Từ … đến …" luôn tự tính từ các phiên bản
 *             đang bán, khách thanh toán đúng giá phiên bản đã chọn.
 * - CONTACT — không niêm yết giá, khách liên hệ (gọi / Zalo / nhắn tin), không đặt online.
 * Ngày cao điểm = ngày lễ cửa hàng khai (`brochure_holidays`) + cuối tuần nếu sản phẩm bật.
 * `attributes.price` vẫn giữ GIÁ THẤP NHẤT để báo cáo, sắp xếp, AI dùng chung (PO đồng ý).
 * Pure TypeScript.
 */

import { formatCurrency } from "@/lib/i18n/formatters"

export const PRICING_KEY = "pricing"
export const PRICE_MODES = ["FIXED", "RANGE", "CONTACT"] as const
export type PriceMode = (typeof PRICE_MODES)[number]

export const MAX_DIMENSIONS = 2
export const MAX_DIMENSION_VALUES = 12
export const MAX_PRICE_VND = 1_000_000_000
const LABEL_MAX = 40

export interface PriceDimension {
  /** Mã nhóm theo ngành (`SIZE`, `COLOR`…) hoặc `CUSTOM_n` */
  key: string
  label: string
  values: string[]
}

export interface PriceOptionRow {
  /** Giá trị theo thứ tự `dimensions`, ví dụ ["Nhỏ", "Đỏ"] */
  values: string[]
  priceVnd: number | null
  /** Giá ngày cao điểm; `null` = như giá thường */
  peakPriceVnd: number | null
  active: boolean
  /** Mã ảnh riêng của phiên bản trong kho ảnh (`assets.id`); `null` = dùng ảnh mẫu */
  imageAssetId: string | null
  /** Số cành/số hoa của phiên bản — phiếu thợ in theo phiên bản khách chọn (checklist ALG 2.4); `null` = theo công thức mẫu */
  stemCount: number | null
}

export interface ProductPricing {
  mode: PriceMode
  /** FIXED: giá duy nhất */
  priceVnd: number | null
  peakPriceVnd: number | null
  dimensions: PriceDimension[]
  rows: PriceOptionRow[]
  /** Thứ 7, Chủ nhật tính là cao điểm */
  weekendIsPeak: boolean
}

export interface PriceSummary {
  mode: PriceMode
  minVnd: number | null
  maxVnd: number | null
  /** Có giá cao điểm khác giá thường */
  hasPeak: boolean
  /** Khách đặt online được không */
  orderable: boolean
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

function money(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= MAX_PRICE_VND ? Math.round(v) : null
}

function assetId(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : null
}

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 9999 ? v : null
}

function label(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, LABEL_MAX) : ""
}

/** Mã ổn định của một phiên bản — dùng làm `variantId` khi khách đặt. */
export function optionId(values: readonly string[]): string {
  // Băm ngắn (FNV-1a 32-bit ×2) để vừa giới hạn 64 ký tự của API công khai, kể cả giá trị tiếng Việt dài
  const key = values.map((v) => v.trim().toLowerCase().normalize("NFC")).join("\u0001")
  let a = 0x811c9dc5
  let b = 0x01000193
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i)
    a = Math.imul(a ^ c, 0x01000193) >>> 0
    b = Math.imul(b ^ c, 0x811c9dc5) >>> 0
  }
  return `opt:${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`
}

/** Phiên bản khai theo kiểu "Khoảng giá" (không phải size cũ) — khách bắt buộc chọn. */
export function isOptionId(id: string): boolean {
  return id.startsWith("opt:")
}

export function optionName(values: readonly string[]): string {
  return values.join(" / ")
}

function parseDimensions(raw: unknown): PriceDimension[] {
  if (!Array.isArray(raw)) return []
  const out: PriceDimension[] = []
  for (const d of raw) {
    const r = rec(d)
    const name = label(r.label)
    const seen = new Set<string>()
    const values: string[] = []
    for (const v of Array.isArray(r.values) ? r.values : []) {
      const s = label(v)
      if (s && !seen.has(s.toLowerCase())) {
        seen.add(s.toLowerCase())
        values.push(s)
      }
    }
    if (!name || values.length === 0) continue
    out.push({ key: label(r.key) || `CUSTOM_${out.length + 1}`, label: name, values: values.slice(0, MAX_DIMENSION_VALUES) })
    if (out.length >= MAX_DIMENSIONS) break
  }
  return out
}

/** Mọi tổ hợp giá trị của các nhóm (tích Descartes), theo thứ tự khai báo. */
export function combinations(dimensions: readonly PriceDimension[]): string[][] {
  return dimensions.reduce<string[][]>((acc, d) => acc.flatMap((prefix) => d.values.map((v) => [...prefix, v])), [[]])
}

/**
 * Đọc `attributes.pricing`. Sản phẩm cũ (chỉ có `attributes.price`) → FIXED với giá đó;
 * không có giá → FIXED chưa có giá (giữ hành vi cũ: nhận đơn, cửa hàng báo giá sau).
 */
export function parsePricing(attributes: unknown): ProductPricing {
  const attrs = rec(attributes)
  const p = rec(attrs[PRICING_KEY])
  const mode: PriceMode = PRICE_MODES.includes(p.mode as PriceMode) ? (p.mode as PriceMode) : "FIXED"
  const legacyPrice = money(attrs.price) ?? money(attrs.price_vnd)
  const dimensions = mode === "RANGE" ? parseDimensions(p.dimensions) : []
  const saved = new Map<string, Record<string, unknown>>()
  for (const r of Array.isArray(p.rows) ? p.rows : []) {
    const values = Array.isArray(rec(r).values) ? (rec(r).values as unknown[]).map(label) : []
    saved.set(optionId(values), rec(r))
  }
  const rows: PriceOptionRow[] = combinations(dimensions)
    .filter((c) => c.length > 0)
    .map((values) => {
      const r = saved.get(optionId(values)) ?? {}
      return { values, priceVnd: money(r.price_vnd), peakPriceVnd: money(r.peak_price_vnd), active: r.active !== false, imageAssetId: assetId(r.image_asset_id), stemCount: count(r.stem_count) }
    })
  return {
    mode,
    // `attributes.price` đi trước: nhập Excel mẫu cũ chỉ đổi cột giá vẫn ăn đúng
    priceVnd: mode === "FIXED" ? legacyPrice ?? money(p.price_vnd) : null,
    peakPriceVnd: mode === "FIXED" ? money(p.peak_price_vnd) : null,
    dimensions,
    rows,
    weekendIsPeak: p.weekend_is_peak === true,
  }
}

/** Ghi lại dạng lưu trong `attributes` (snake_case), kèm `price` = giá thấp nhất. */
export function serializePricing(pricing: ProductPricing): { price: number | null; price_vnd: number | null; pricing: Record<string, unknown> } {
  const min = summarizePricing(pricing).minVnd
  return {
    price: min,
    price_vnd: min,
    pricing: {
      mode: pricing.mode,
      price_vnd: pricing.mode === "FIXED" ? pricing.priceVnd : null,
      peak_price_vnd: pricing.mode === "FIXED" ? pricing.peakPriceVnd : null,
      dimensions: pricing.mode === "RANGE" ? pricing.dimensions : [],
      rows:
        pricing.mode === "RANGE"
          ? pricing.rows.map((r) => ({ values: r.values, price_vnd: r.priceVnd, peak_price_vnd: r.peakPriceVnd, active: r.active, image_asset_id: r.imageAssetId, stem_count: r.stemCount }))
          : [],
      weekend_is_peak: pricing.weekendIsPeak,
    },
  }
}

/** Lỗi theo trường (tiếng Việt); rỗng = hợp lệ. */
export function validatePricing(pricing: ProductPricing): string[] {
  const errors: string[] = []
  if (pricing.mode === "FIXED" && pricing.peakPriceVnd !== null && pricing.priceVnd === null) {
    errors.push("Vui lòng nhập giá thường trước khi nhập giá cao điểm")
  }
  if (pricing.mode === "RANGE") {
    if (pricing.dimensions.length === 0) errors.push("Vui lòng thêm ít nhất một nhóm đặc điểm (ví dụ Kích cỡ)")
    const active = pricing.rows.filter((r) => r.active)
    if (pricing.dimensions.length > 0 && active.length === 0) errors.push("Cần ít nhất một phiên bản đang bán")
    for (const r of active) {
      if (r.priceVnd === null) errors.push(`Vui lòng nhập giá cho phiên bản ${optionName(r.values)}`)
    }
  }
  return errors
}

/** Khoảng giá hiển thị — chỉ tính phiên bản đang bán, cả giá thường lẫn giá cao điểm. */
export function summarizePricing(pricing: ProductPricing): PriceSummary {
  if (pricing.mode === "CONTACT") return { mode: "CONTACT", minVnd: null, maxVnd: null, hasPeak: false, orderable: false }
  const pairs: Array<[number, number | null]> =
    pricing.mode === "FIXED"
      ? pricing.priceVnd !== null ? [[pricing.priceVnd, pricing.peakPriceVnd]] : []
      : pricing.rows.filter((r) => r.active && r.priceVnd !== null).map((r) => [r.priceVnd as number, r.peakPriceVnd])
  const base = pairs.map(([b]) => b)
  const all = pairs.flatMap(([b, p]) => (p === null ? [b] : [b, p]))
  const hasPeak = pairs.some(([b, p]) => p !== null && p !== b)
  return {
    mode: pricing.mode,
    minVnd: base.length ? Math.min(...base) : null,
    maxVnd: all.length ? Math.max(...all) : null,
    hasPeak,
    orderable: pricing.mode === "FIXED" || base.length > 0,
  }
}

/** Phiên bản khách chọn được (đang bán, có giá) — cho trang đặt hàng. */
export interface SellableOption {
  id: string
  name: string
  /** Giá trị theo thứ tự nhóm đặc điểm — để khách chọn từng nhóm */
  values: string[]
  priceVnd: number
  peakPriceVnd: number | null
  imageAssetId: string | null
  stemCount: number | null
  /** Đường dẫn ảnh đã ký (máy chủ điền khi hiển thị cho khách) */
  imageUrl?: string | null | undefined
}

export function sellableOptions(pricing: ProductPricing): SellableOption[] {
  if (pricing.mode !== "RANGE") return []
  return pricing.rows
    .filter((r): r is PriceOptionRow & { priceVnd: number } => r.active && r.priceVnd !== null)
    .map((r) => ({ id: optionId(r.values), name: optionName(r.values), values: r.values, priceVnd: r.priceVnd, peakPriceVnd: r.peakPriceVnd, imageAssetId: r.imageAssetId, stemCount: r.stemCount }))
}

/** Thứ 7 / Chủ nhật của ngày `YYYY-MM-DD` (theo lịch, không phụ thuộc múi giờ máy chủ). */
/** Mã ảnh riêng của các phiên bản — để máy chủ ký đường dẫn cùng ảnh mẫu. */
export function variantImageAssetIds(attributes: unknown): string[] {
  return parsePricing(attributes).rows.flatMap((r) => (r.imageAssetId ? [r.imageAssetId] : []))
}

/**
 * Khách chọn từng nhóm: giá trị nào còn chọn được khi đã chọn các nhóm khác
 * (`picked[i]` = giá trị đã chọn của nhóm i, hoặc `null`).
 */
export function availableValues(options: readonly SellableOption[], picked: readonly (string | null)[], dimIndex: number): Set<string> {
  const out = new Set<string>()
  for (const o of options) {
    const fits = picked.every((p, i) => i === dimIndex || p === null || o.values[i] === p)
    if (fits && o.values[dimIndex] !== undefined) out.add(o.values[dimIndex]!)
  }
  return out
}

/** Phiên bản khớp đủ mọi nhóm đã chọn, hoặc `null`. */
export function matchOption(options: readonly SellableOption[], picked: readonly (string | null)[]): SellableOption | null {
  if (picked.some((p) => p === null)) return null
  return options.find((o) => o.values.length === picked.length && o.values.every((v, i) => v === picked[i])) ?? null
}

export function isWeekend(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return false
  const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()
  return day === 0 || day === 6
}

/** Đơn giá phải trả: giá cao điểm khi ngày giao là cao điểm và phiên bản có giá cao điểm. */
export function unitPriceFor(priceVnd: number, peakPriceVnd: number | null, isPeakDay: boolean): number {
  return isPeakDay && peakPriceVnd !== null ? peakPriceVnd : priceVnd
}

export function formatVnd(v: number): string {
  return formatCurrency(v)
}

/** Nhãn giá ngắn cho thẻ sản phẩm. */
export function priceLabel(summary: PriceSummary): string {
  if (summary.mode === "CONTACT") return "Liên hệ"
  if (summary.minVnd === null) return "Chưa có giá"
  if (summary.maxVnd === null || summary.maxVnd === summary.minVnd) return formatVnd(summary.minVnd)
  return `${formatVnd(summary.minVnd)} – ${formatVnd(summary.maxVnd)}`
}

/** Đổi nhóm đặc điểm: dựng lại bảng phiên bản, giữ giá đã nhập của tổ hợp còn tồn tại. */
export function withDimensions(pricing: ProductPricing, dimensions: PriceDimension[]): ProductPricing {
  const old = new Map(pricing.rows.map((r) => [optionId(r.values), r]))
  const rows = combinations(dimensions.slice(0, MAX_DIMENSIONS))
    .filter((c) => c.length > 0)
    .map((values) => ({ priceVnd: null, peakPriceVnd: null, active: true, imageAssetId: null, stemCount: null, ...old.get(optionId(values)), values }))
  return { ...pricing, dimensions: dimensions.slice(0, MAX_DIMENSIONS), rows }
}
