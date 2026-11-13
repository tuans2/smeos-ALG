import * as XLSX from "xlsx"
import { MAX_IMPORT_COLUMNS, MAX_IMPORT_ROWS } from "../domain/partner-marketplace-row-mapper"

/** Đọc tab đầu của tệp .xlsx/.xls/.csv thành bảng chuỗi; tệp hỏng → null. */
export function parseMarketplaceWorkbook(buffer: Uint8Array): string[][] | null {
  try {
    const wb = XLSX.read(buffer, { type: "array", dense: true, sheetRows: MAX_IMPORT_ROWS + 1 })
    const ws = wb.SheetNames[0] ? wb.Sheets[wb.SheetNames[0]] : undefined
    if (!ws) return null
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false, blankrows: false })
    return rows.map((r) => r.slice(0, MAX_IMPORT_COLUMNS).map((c) => String(c ?? "")))
  } catch {
    return null
  }
}
