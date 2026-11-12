import * as XLSX from "xlsx"
import type { ParsedProductRow } from "./types"
import { mergeVariantRows, readPriceCells } from "./parse-price-columns"

/**
 * Đọc file Excel/CSV kho sản phẩm → các dòng xem trước. Phần ánh xạ là hàm thuần (có unit test):
 * chấp nhận cả tên cột của Template Master mới lẫn các mẫu cũ (Lovi, Siin, file tự làm).
 */

/** Tên cột chấp nhận cho từng trường, theo thứ tự ưu tiên. */
const COLUMNS = {
  // Tên cột cũ (smeOS/FloraOS) giữ làm bí danh để tệp mẫu tải trước khi đổi tên ALG vẫn nhập được
  code: ["Mã SKU Chuẩn (ALG) *", "Mã SKU Chuẩn (ALG)", "Mã SKU Chuẩn (smeOS) *", "Mã SKU Chuẩn (smeOS)", "Mã SKU Chuẩn (FloraOS) *", "Mã SKU Chuẩn (FloraOS)", "Mã SKU *", "Mã sản phẩm (SKU) *", "Mã Lovi (Loviinet)", "Mã Siin (Siin Store)", "Mã Lovi", "Mã Siin", "Mã sản phẩm", "SKU", "code"],
  // Giữ tiêu đề cột của mẫu cũ ("Tên mẫu hoa") — file Excel tiệm đang dùng vẫn nhập được (audit AUD-037)
  name: ["Tên sản phẩm *", "Tên sản phẩm", "Tên mẫu hoa *", "Tên mẫu hoa", "name"],
  price: ["Giá niêm yết B2C (VNĐ) *", "Giá niêm yết B2C (VNĐ)", "Giá niêm yết B2C", "Giá bán (VNĐ)", "Giá bán", "price"],
  category: ["Danh mục chuẩn *", "Danh mục chuẩn", "Danh mục", "Kiểu cách", "category"],
  shape: ["Kiểu dáng / Dáng cắm", "Kiểu dáng", "Kiểu cách", "shape"],
  facing: ["Hướng nhìn", "facing"],
  container: ["Quy cách đóng gói & Bảo quản", "Quy cách đóng gói", "Vật chứa / Giá đỡ", "Vật chứa", "container"],
  color: ["Tone màu chủ đạo", "Màu sắc / Tone màu", "Màu sắc", "color"],
  description: ["Câu chuyện hoa (Copywriting bán hàng)", "Câu chuyện hoa (copy bán hàng)", "Mô tả / Ý nghĩa hoa", "Mô tả / Ghi chú", "Mô tả", "description"],
  flowersText: ["Hoa chính (BOM)", "Hoa chính (nguyên liệu quyết định)", "Công thức chế tác (BOM)", "Công thức cắm hoa (BOM)", "Công thức hoa (BOM)", "BOM"],
  imageFileName: ["Tên file ảnh (hoặc URL ảnh) *", "Tên file ảnh chuẩn hóa ( ALG Media )", "Tên file ảnh chuẩn hóa ( smeOS Media )", "Tên file ảnh chuẩn hóa ( FloraOS Media )", "Tên file ảnh chuẩn hóa", "Ảnh thành phẩm chuẩn", "Tên file ảnh (tuỳ chọn)", "Tên file ảnh", "Tên ảnh", "image"],
  loviCode: ["Mã Lovi (Loviinet)", "Mã Lovi"],
  siinCode: ["Mã Siin (Siin Store)", "Mã Siin"],
  driveLink: ["Link ảnh thành phẩm chuẩn (Drive)", "Link ảnh Drive", "Google Drive"],
} as const

const HEADER_HINTS = ["sku", "mã sku", "tên mẫu", "tên sản phẩm", "mã lovi", "mã siin"]
const HEADER_SCAN_ROWS = 10

type RawRecord = Record<string, unknown>

function pick(d: RawRecord, names: readonly string[], fallback = ""): string {
  for (const n of names) {
    const v = d[n]
    if (v !== undefined && v !== null) return String(v).trim()
  }
  return fallback
}

/** Dòng tiêu đề thật: dòng đầu tiên (trong 10 dòng) có chứa SKU/Mã/Tên — hỗ trợ tiêu đề 1 hoặc 2 tầng. */
export function findHeaderRow(matrix: unknown[][]): number {
  for (let r = 0; r < Math.min(HEADER_SCAN_ROWS, matrix.length); r++) {
    const text = (matrix[r] ?? []).map((c) => String(c ?? "").toLowerCase()).join(" ")
    if (HEADER_HINTS.some((h) => text.includes(h))) return r
  }
  return 0
}

/** Ma trận ô → bản ghi theo tên cột; bỏ dòng trống và dòng ví dụ ("VD:"). */
export function matrixToRecords(matrix: unknown[][]): RawRecord[] {
  const headerRow = findHeaderRow(matrix)
  const headers = (matrix[headerRow] ?? []).map((h) => String(h ?? "").trim())
  const records: RawRecord[] = []
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const values = matrix[r] ?? []
    if (/^vd:/i.test(String(values[0] ?? "").trim())) continue
    const record: RawRecord = {}
    let hasData = false
    headers.forEach((h, c) => {
      if (!h) return
      record[h] = values[c]
      if (values[c] !== undefined && values[c] !== null && String(values[c]).trim() !== "") hasData = true
    })
    if (hasData) records.push(record)
  }
  return records
}

/**
 * Giá VNĐ: số giữ nguyên (làm tròn); chuỗi "1.500.000", "1,500,000 đ", "1500000" → 1500000.
 * Không phải số dương ("Liên hệ", trống, âm) → null = chưa niêm yết.
 */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null
  if (raw === null || raw === undefined) return null
  const digits = String(raw).replace(/[.,\s]/g, "").replace(/(đ|vnđ|vnd)$/i, "")
  if (!/^\d+$/.test(digits)) return null
  const n = Number(digits)
  return n > 0 ? n : null
}

/** Một bản ghi → dòng xem trước. Thiếu mã/tên → ERROR. */
export function mapRecordToRow(d: RawRecord, index: number): ParsedProductRow {
  const code = pick(d, COLUMNS.code)
  const name = pick(d, COLUMNS.name)
  const driveLink = pick(d, COLUMNS.driveLink)
  const loviCode = pick(d, COLUMNS.loviCode)
  const siinCode = pick(d, COLUMNS.siinCode)
  const priceRaw = COLUMNS.price.map((n) => d[n]).find((v) => v !== undefined && v !== null) ?? null
  const missing = !code || !name
  return {
    index: index + 1,
    code,
    loviCode: loviCode || undefined,
    siinCode: siinCode || undefined,
    name,
    price: parsePrice(priceRaw),
    category: pick(d, COLUMNS.category, "Sản phẩm"),
    shape: pick(d, COLUMNS.shape, "Dáng tròn"),
    facing: pick(d, COLUMNS.facing, "Một mặt"),
    container: pick(d, COLUMNS.container),
    color: pick(d, COLUMNS.color),
    description: pick(d, COLUMNS.description),
    flowersText: pick(d, COLUMNS.flowersText),
    driveLink: driveLink || undefined,
    imageFileName: pick(d, COLUMNS.imageFileName),
    matchedFile: null,
    previewUrl: null,
    status: missing ? "ERROR" : driveLink ? "DRIVE_SYNC" : "NO_IMAGE",
    errorMsg: missing ? "Thiếu mã hoặc tên sản phẩm" : undefined,
  }
}

/** Mã trùng trong cùng file → dòng sau bị đánh ERROR (server cũng sẽ bỏ qua, báo sớm cho người nhập). */
export function markDuplicateCodes(rows: ParsedProductRow[]): ParsedProductRow[] {
  const seen = new Map<string, number>()
  return rows.map((row) => {
    if (row.status === "ERROR") return row
    const key = row.code.toLowerCase()
    const first = seen.get(key)
    if (first !== undefined) return { ...row, status: "ERROR", errorMsg: `Trùng mã với dòng ${first}` }
    seen.set(key, row.index)
    return row
  })
}

/** Ma trận → các dòng xem trước; ném lỗi tiếng Việt khi file không có dữ liệu. */
export function parseProductMatrix(matrix: unknown[][]): ParsedProductRow[] {
  if (matrix.length === 0) throw new Error("File không chứa dữ liệu sản phẩm.")
  const records = matrixToRecords(matrix)
  if (records.length === 0) throw new Error("File không chứa bản ghi dữ liệu sản phẩm hợp lệ.")
  const rows = records.map((r, i) => ({ ...mapRecordToRow(r, i), priceCells: readPriceCells(r, parsePrice) }))
  return markDuplicateCodes(mergeVariantRows(rows))
}

/** Đọc nội dung file (.xlsx/.xls/.csv) → các dòng xem trước. */
export function parseProductWorkbook(buffer: ArrayBuffer, fileName: string): ParsedProductRow[] {
  const wb = fileName.toLowerCase().endsWith(".csv")
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string" })
    : XLSX.read(buffer, { type: "array" })
  const sheetName = wb.SheetNames[0]
  const sheet = sheetName ? wb.Sheets[sheetName] : undefined
  if (!sheet) throw new Error("File Excel/CSV không có sheet nào.")
  return parseProductMatrix(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }))
}

/** "Hồng đỏ 10 cành, Baby 2 bó" → BOM có cấu trúc (thiếu số lượng → 1 cành). */
export function parseFlowersText(text: string) {
  if (!text.trim()) return []
  return text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).map((item) => {
    const match = item.match(/(\d+)\s*(cành|bông|nhánh|gói|bó|cây)?/i)
    return {
      name: item.replace(/\d+\s*(cành|bông|nhánh|gói|bó|cây)?/i, "").trim() || item,
      quantity: match ? Number(match[1]) : 1,
      unit: match?.[2] || "cành",
      color: "Tiêu chuẩn",
      role: "Chủ đạo",
    }
  })
}
