/**
 * Xuất danh sách sản phẩm ra CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt).
 * Thuần TypeScript — chỉ nhận dữ liệu đã cắt giá theo `L5` từ use-case.
 */

export interface ProductCsvRow {
  code: string
  name: string
  category: string | null
  status: string
  price_vnd: number | null
}

export const PRODUCT_CSV_HEADERS = ["Mã", "Tên", "Danh mục", "Trạng thái", "Giá (VNĐ)"] as const

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang bán",
  ARCHIVED: "Ngừng bán",
}

/** Bọc ô CSV; chặn chèn công thức Excel (`=`, `+`, `-`, `@`) bằng dấu nháy đơn. */
export function csvCell(value: string | number | null): string {
  if (value === null) return ""
  let text = String(value)
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildProductCsv(rows: ProductCsvRow[], opts: { includePrice: boolean }): string {
  const headers = opts.includePrice ? PRODUCT_CSV_HEADERS : PRODUCT_CSV_HEADERS.slice(0, 4)
  const lines = [headers.map(csvCell).join(",")]
  for (const r of rows) {
    const cells: Array<string | number | null> = [r.code, r.name, r.category, STATUS_LABELS[r.status] ?? r.status]
    if (opts.includePrice) cells.push(r.price_vnd)
    lines.push(cells.map(csvCell).join(","))
  }
  return "﻿" + lines.join("\r\n") + "\r\n"
}
