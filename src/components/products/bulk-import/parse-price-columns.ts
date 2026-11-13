import {
  MAX_DIMENSIONS,
  MAX_DIMENSION_VALUES,
  optionId,
  validatePricing,
  withDimensions,
  type PriceMode,
  type ProductPricing,
} from "@/modules/products/domain/product-pricing"
import { EMPTY_PRICING } from "../pricing/pricing-form"
import type { ParsedProductRow } from "./types"

/**
 * Cột kiểu giá trong file nhập (PO 22/10/2026). Khoảng giá: MỖI DÒNG MỘT PHIÊN BẢN — các dòng
 * cùng mã SKU được gộp thành một sản phẩm. File không có cột "Kiểu giá" → giữ cách nhập cũ.
 */
export const PRICE_COLUMNS = {
  mode: ["Kiểu giá", "price_mode"],
  peak: ["Giá cao điểm (VNĐ)", "Giá cao điểm", "peak_price"],
  dim1: ["Nhóm đặc điểm 1", "Đặc điểm 1"],
  val1: ["Giá trị 1", "Giá trị đặc điểm 1"],
  dim2: ["Nhóm đặc điểm 2", "Đặc điểm 2"],
  val2: ["Giá trị 2", "Giá trị đặc điểm 2"],
  active: ["Đang bán", "Còn bán"],
  weekend: ["Cuối tuần cao điểm", "Thứ 7, CN cao điểm"],
} as const

export interface PriceCells {
  mode: PriceMode | null
  /** Có ô kiểu giá nhưng không đọc được */
  modeInvalid: boolean
  peak: number | null
  dims: Array<{ label: string; value: string }>
  active: boolean
  weekend: boolean
}

type RawRecord = Record<string, unknown>

function cell(d: RawRecord, names: readonly string[]): string {
  for (const n of names) {
    const v = d[n]
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim()

export function parsePriceMode(raw: string): PriceMode | null {
  const v = fold(raw)
  if (!v) return null
  if (["gia xac dinh", "co dinh", "xac dinh", "fixed"].includes(v)) return "FIXED"
  if (["khoang gia", "theo phien ban", "range"].includes(v)) return "RANGE"
  if (["lien he", "contact"].includes(v)) return "CONTACT"
  return null
}

const NO = new Set(["khong", "no", "0", "false", "het", "ngung"])
const YES = new Set(["co", "yes", "1", "true", "x"])

export function readPriceCells(d: RawRecord, parseMoney: (raw: unknown) => number | null): PriceCells {
  const modeRaw = cell(d, PRICE_COLUMNS.mode)
  const mode = parsePriceMode(modeRaw)
  const dims: PriceCells["dims"] = []
  for (const [dk, vk] of [["dim1", "val1"], ["dim2", "val2"]] as const) {
    const label = cell(d, PRICE_COLUMNS[dk])
    const value = cell(d, PRICE_COLUMNS[vk])
    if (label && value) dims.push({ label: label.slice(0, 40), value: value.slice(0, 40) })
  }
  return {
    mode,
    modeInvalid: modeRaw !== "" && mode === null,
    peak: parseMoney(cell(d, PRICE_COLUMNS.peak) || null),
    dims,
    active: !NO.has(fold(cell(d, PRICE_COLUMNS.active))),
    weekend: YES.has(fold(cell(d, PRICE_COLUMNS.weekend))),
  }
}

/** Dựng kiểu giá cho một sản phẩm từ các dòng (đã cùng mã). Lỗi tiếng Việt hoặc kiểu giá. */
export function buildPricing(lines: Array<{ price: number | null; cells: PriceCells }>): ProductPricing | string {
  const first = lines[0]!.cells
  const mode = first.mode ?? "FIXED"
  if (mode !== "RANGE") {
    return { ...EMPTY_PRICING, mode, priceVnd: mode === "FIXED" ? lines[0]!.price : null, peakPriceVnd: mode === "FIXED" ? first.peak : null, weekendIsPeak: first.weekend }
  }
  const labels = first.dims.map((x) => x.label)
  if (labels.length === 0) return "Khoảng giá cần cột Nhóm đặc điểm 1 và Giá trị 1"
  const values: string[][] = labels.map(() => [])
  for (const l of lines) {
    if (l.cells.dims.length !== labels.length || l.cells.dims.some((x, i) => x.label.toLowerCase() !== labels[i]!.toLowerCase())) {
      return `Các dòng cùng mã phải có cùng nhóm đặc điểm (${labels.join(", ")})`
    }
    l.cells.dims.forEach((x, i) => {
      if (!values[i]!.some((v) => v.toLowerCase() === x.value.toLowerCase())) values[i]!.push(x.value)
    })
  }
  if (labels.length > MAX_DIMENSIONS || values.some((v) => v.length > MAX_DIMENSION_VALUES)) {
    return `Tối đa ${MAX_DIMENSIONS} nhóm, mỗi nhóm ${MAX_DIMENSION_VALUES} giá trị`
  }
  const base = withDimensions(
    { ...EMPTY_PRICING, mode: "RANGE", weekendIsPeak: first.weekend },
    labels.map((label, i) => ({ key: `CUSTOM_${i + 1}`, label, values: values[i]! }))
  )
  const byId = new Map(lines.map((l) => [optionId(l.cells.dims.map((x) => x.value)), l]))
  // Tổ hợp không có dòng trong file → tắt bán (không bắt khai đủ mọi tổ hợp)
  const rows = base.rows.map((r) => {
    const l = byId.get(optionId(r.values))
    return l ? { ...r, priceVnd: l.price, peakPriceVnd: l.cells.peak, active: l.cells.active } : { ...r, active: false }
  })
  const pricing = { ...base, rows }
  const errors = validatePricing(pricing)
  return errors.length > 0 ? errors[0]! : pricing
}

/**
 * Gộp các dòng Khoảng giá cùng mã thành một sản phẩm (dòng đầu giữ thông tin chung).
 * Dòng trùng mã KHÔNG phải Khoảng giá vẫn để `markDuplicateCodes` báo lỗi như cũ.
 */
export function mergeVariantRows(rows: Array<ParsedProductRow & { priceCells: PriceCells }>): ParsedProductRow[] {
  const groups = new Map<string, Array<ParsedProductRow & { priceCells: PriceCells }>>()
  const out: Array<ParsedProductRow & { priceCells?: PriceCells }> = []
  for (const row of rows) {
    if (row.priceCells.mode === "RANGE" && row.code) {
      const key = row.code.toLowerCase()
      const g = groups.get(key)
      // Dòng phiên bản tiếp theo chỉ cần mã + giá + đặc điểm (tên, mô tả lấy từ dòng đầu)
      if (g) {
        g.push(row)
        continue
      }
      if (row.status !== "ERROR") groups.set(key, [row])
    }
    out.push(row)
  }
  return out.map(({ priceCells, ...row }) => {
    if (row.status === "ERROR" || !priceCells) return row
    // Không ghi ô "Kiểu giá" → giữ cách nhập cũ, không đụng kiểu giá đã khai trên phần mềm
    if (priceCells.mode === null && !priceCells.modeInvalid) return row
    if (priceCells.modeInvalid) return { ...row, status: "ERROR", errorMsg: "Kiểu giá chỉ nhận: Giá xác định, Khoảng giá, Liên hệ" }
    const lines = priceCells.mode === "RANGE" ? groups.get(row.code.toLowerCase())! : [{ ...row, priceCells }]
    const pricing = buildPricing(lines.map((l) => ({ price: l.price, cells: l.priceCells })))
    if (typeof pricing === "string") return { ...row, status: "ERROR", errorMsg: pricing }
    return { ...row, pricing, variantCount: priceCells.mode === "RANGE" ? lines.length : undefined }
  })
}
