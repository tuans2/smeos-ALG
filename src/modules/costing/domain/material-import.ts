import type { IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import { normalizeMaterialName } from "./bom-adapters"

export interface ImportedMaterialRow {
  name: string
  unit: string
  categoryKey: string
  unitCostVnd: number | null
}

export interface MaterialImportResult {
  rows: ImportedMaterialRow[]
  /** Dòng bỏ qua, đánh số từ 1 theo bảng người dùng dán, kèm lý do bằng lời. */
  skipped: { line: number; reason: string }[]
}

const HEADER_WORDS = ["ten", "ten nguyen lieu", "name"]

function parseMoney(raw: string | undefined): number | null | "invalid" {
  const t = (raw ?? "").replace(/[.\s₫đ]/gi, "").replace(/,/g, "").trim()
  if (t === "") return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : "invalid"
}

/**
 * #32 — đọc bảng dán từ Excel/Google Sheets (cột cách bằng Tab, hoặc dấu phẩy/chấm phẩy).
 * Cột: Tên · Nhóm · Đơn vị · Đơn giá. Nhóm ghi theo tên nhóm của ngành (không dấu cũng được);
 * trống hoặc không khớp thì dùng `fallbackCategoryKey`. Đơn vị trống thì lấy đơn vị mặc định của nhóm.
 */
export function parseMaterialTable(text: string, spec: IndustryCostingSpec, fallbackCategoryKey: string): MaterialImportResult {
  const byLabel = new Map(spec.materialCategories.map((c) => [normalizeMaterialName(c.label), c]))
  const rows: ImportedMaterialRow[] = []
  const skipped: MaterialImportResult["skipped"] = []
  const seen = new Set<string>()
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = i + 1
    if (!rawLine.trim()) return
    const cells = (rawLine.includes("\t") ? rawLine.split("\t") : rawLine.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/)).map((c) => c.replace(/^"|"$/g, "").trim())
    const name = cells[0] ?? ""
    if (i === 0 && HEADER_WORDS.includes(normalizeMaterialName(name))) return
    if (!name) return skipped.push({ line, reason: "Thiếu tên nguyên liệu" })
    if (name.length > 120) return skipped.push({ line, reason: "Tên dài quá 120 ký tự" })
    const key = normalizeMaterialName(name)
    if (seen.has(key)) return skipped.push({ line, reason: "Trùng tên với dòng phía trên" })
    const category = byLabel.get(normalizeMaterialName(cells[1] ?? "")) ?? spec.materialCategories.find((c) => c.key === fallbackCategoryKey)
    if (!category) return skipped.push({ line, reason: "Không xác định được nhóm" })
    const price = parseMoney(cells[3])
    if (price === "invalid") return skipped.push({ line, reason: "Đơn giá không phải số" })
    seen.add(key)
    rows.push({ name, unit: (cells[2] ?? "").slice(0, 30) || category.defaultUnit, categoryKey: category.key, unitCostVnd: price })
  })
  return { rows, skipped }
}
