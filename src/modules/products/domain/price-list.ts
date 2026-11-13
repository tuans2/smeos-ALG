/**
 * Bảng giá sản phẩm (PO 30/10/2026) — tài liệu giá gửi khách / in tại quầy, dựng từ giá đang
 * bán của sản phẩm (`products.attributes.pricing`), KHÔNG lưu giá riêng: đổi giá sản phẩm là
 * bảng giá tự cập nhật, không có hai nguồn giá lệch nhau.
 *
 * Lưu ở `pricing_rules` với khoá `price_list:<id>` — bảng chỉ chèn thêm dòng, nên mỗi lần sửa
 * là một phiên bản và tra lại được "bảng giá lúc đó". Mỗi bảng có công tắc Đang dùng giống ưu đãi.
 * Pure TypeScript.
 */

import { INDUSTRY_REGISTRY } from "@/modules/organization/domain/industries"

import { parsePricing, sellableOptions, summarizePricing, type PriceMode } from "./product-pricing"

export const PRICE_LIST_KEY_PREFIX = "price_list:"
export const MAX_PRICE_LISTS = 50
export const MAX_PRICE_LIST_PRODUCTS = 500
const DATE = /^\d{4}-\d{2}-\d{2}$/

export interface PriceListConfig {
  id: string
  name: string
  /** Dòng tiêu đề in trên bảng giá; rỗng = dùng `name` */
  heading: string
  note: string
  /** Lọc theo loại sản phẩm; rỗng = mọi loại */
  categories: string[]
  /** Chọn đích danh; null = theo `categories` */
  productIds: string[] | null
  validFrom: string | null
  validTo: string | null
  showPeakPrice: boolean
  /** In kèm các ưu đãi đang bật của cửa hàng */
  showPromotions: boolean
  active: boolean
  archived: boolean
}

export type PriceListInput = Omit<PriceListConfig, "id" | "archived">

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const strList = (v: unknown, max: number) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()))].slice(0, max) : []
const date = (v: unknown) => (typeof v === "string" && DATE.test(v) ? v : null)

export function priceListKey(id: string): string {
  return `${PRICE_LIST_KEY_PREFIX}${id}`
}

/** Đọc một dòng `pricing_rules` đã lưu; hỏng → null (không làm vỡ cả danh sách). */
export function parsePriceList(key: string, value: unknown): PriceListConfig | null {
  if (!key.startsWith(PRICE_LIST_KEY_PREFIX) || !value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const name = str(v.name, 120)
  if (!name) return null
  return {
    id: key.slice(PRICE_LIST_KEY_PREFIX.length),
    name,
    heading: str(v.heading, 160),
    note: str(v.note, 1000),
    categories: strList(v.categories, 50),
    productIds: Array.isArray(v.productIds) ? strList(v.productIds, MAX_PRICE_LIST_PRODUCTS) : null,
    validFrom: date(v.validFrom),
    validTo: date(v.validTo),
    showPeakPrice: v.showPeakPrice !== false,
    showPromotions: v.showPromotions !== false,
    active: v.active !== false,
    archived: v.archived === true,
  }
}

export function validatePriceList(input: PriceListInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.name.trim().length < 2 || input.name.trim().length > 120) errors.name = "Tên bảng giá cần từ 2 đến 120 ký tự"
  if (input.heading.length > 160) errors.heading = "Tiêu đề tối đa 160 ký tự"
  if (input.note.length > 1000) errors.note = "Ghi chú tối đa 1000 ký tự"
  if (input.validFrom !== null && !DATE.test(input.validFrom)) errors.validFrom = "Ngày không hợp lệ"
  if (input.validTo !== null && !DATE.test(input.validTo)) errors.validTo = "Ngày không hợp lệ"
  if (input.validFrom && input.validTo && input.validTo < input.validFrom) errors.validTo = "Ngày kết thúc phải sau ngày bắt đầu"
  if (input.productIds !== null && input.productIds.length > MAX_PRICE_LIST_PRODUCTS) {
    errors.productIds = `Tối đa ${MAX_PRICE_LIST_PRODUCTS} sản phẩm mỗi bảng giá`
  }
  return errors
}

export type PriceListStatus = "ACTIVE" | "PAUSED" | "SCHEDULED" | "EXPIRED"

export const PRICE_LIST_STATUS_LABEL: Record<PriceListStatus, string> = {
  ACTIVE: "Đang dùng",
  PAUSED: "Đang tắt",
  SCHEDULED: "Chưa đến ngày",
  EXPIRED: "Đã hết hạn",
}

/** `today` dạng YYYY-MM-DD theo giờ Việt Nam. */
export function priceListStatus(c: Pick<PriceListConfig, "active" | "validFrom" | "validTo">, today: string): PriceListStatus {
  if (!c.active) return "PAUSED"
  if (c.validTo && c.validTo < today) return "EXPIRED"
  if (c.validFrom && c.validFrom > today) return "SCHEDULED"
  return "ACTIVE"
}

export interface PriceListProduct {
  id: string
  code: string
  name: string
  category: string | null
  status: string
  attributes: unknown
}

export interface PriceListOption {
  name: string
  priceVnd: number
  peakPriceVnd: number | null
}

export interface PriceListRow {
  productId: string
  code: string
  name: string
  mode: PriceMode
  /** FIXED: giá; RANGE: giá thấp nhất; CONTACT/chưa có giá: null */
  priceVnd: number | null
  peakPriceVnd: number | null
  options: PriceListOption[]
}

export interface PriceListGroup {
  category: string
  rows: PriceListRow[]
}

const UNCATEGORIZED = "Sản phẩm khác"

/** Mã loại → tên loại theo plugin ngành (SSOT thuật ngữ); mã trùng giữa các ngành lấy ngành đầu tiên. */
const INDUSTRY_CATEGORY_LABEL: ReadonlyMap<string, string> = new Map(
  Object.values(INDUSTRY_REGISTRY).flatMap((plugin) => plugin.taxonomy.defaultCategories.map((c) => [c.key, c.label] as const)).reverse(),
)

/**
 * Tên loại hiện cho khách. Sản phẩm cũ/nhập mẫu lưu mã (BOX, BASKET…) — đổi sang tên loại của
 * ngành; mã lạ gom vào "Sản phẩm khác" (không in mã kỹ thuật). Loại tiệm tự gõ giữ nguyên.
 */
export function categoryLabel(raw: string | null): string {
  const value = raw?.trim() ?? ""
  if (!value) return UNCATEGORIZED
  if (/^[A-Z_]+$/.test(value)) return INDUSTRY_CATEGORY_LABEL.get(value) ?? UNCATEGORIZED
  return value
}

/** Nhóm theo loại, chỉ sản phẩm đang bán; thứ tự theo tên loại rồi tên sản phẩm. */
export function buildPriceListGroups(config: Pick<PriceListConfig, "categories" | "productIds" | "showPeakPrice">, products: readonly PriceListProduct[]): PriceListGroup[] {
  const picked = config.productIds ? new Set(config.productIds) : null
  const cats = new Set(config.categories)
  const groups = new Map<string, PriceListRow[]>()
  for (const p of products) {
    if (p.status !== "ACTIVE") continue
    if (picked ? !picked.has(p.id) : cats.size > 0 && !cats.has(p.category ?? "")) continue
    const pricing = parsePricing(p.attributes)
    const summary = summarizePricing(pricing)
    const peak = (v: number | null) => (config.showPeakPrice ? v : null)
    const row: PriceListRow = {
      productId: p.id,
      code: p.code,
      name: p.name,
      mode: pricing.mode,
      priceVnd: pricing.mode === "FIXED" ? pricing.priceVnd : summary.minVnd,
      peakPriceVnd: pricing.mode === "FIXED" ? peak(pricing.peakPriceVnd) : null,
      options: sellableOptions(pricing).map((o) => ({ name: o.name, priceVnd: o.priceVnd, peakPriceVnd: peak(o.peakPriceVnd) })),
    }
    const key = categoryLabel(p.category)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b, "vi")))
    .map(([category, rows]) => ({ category, rows: rows.sort((a, b) => a.name.localeCompare(b.name, "vi")) }))
}
