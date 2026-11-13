/**
 * Ghép cột tệp khảo sát với 75 trường theo TÊN tiêu đề (không theo vị trí) — tệp thêm,
 * bớt hay đổi chỗ cột vẫn vào đúng trường. Thuần — dùng ở máy chủ và trình duyệt.
 *
 * `ColumnMapping[i]` = chỉ số cột trong tệp cho trường thứ i của `SURVEY_COLUMNS`,
 * `null` = không lấy.
 */
import { SHOP_NAME_FIELD, SURVEY_COLUMNS } from "./partner-marketplace-columns"

export type ColumnMapping = (number | null)[]
export type MatchSource = "header" | "position" | null

export interface DetectedMapping {
  mapping: ColumnMapping
  /** Cách mỗi trường được ghép: theo tên tiêu đề, theo vị trí gốc, hoặc chưa ghép. */
  source: MatchSource[]
}

const FIELD_COUNT = SURVEY_COLUMNS.length
/** Tỷ lệ trường khớp tên nằm đúng cột gốc để coi tệp giữ bố cục Sheet gốc. */
const ORIGINAL_LAYOUT_RATIO = 0.6

/** Hai cách bỏ dấu thanh tiếng Việt (hoá/hóa, thuỷ/thủy) quy về một. */
const TONE_VARIANTS: readonly [RegExp, string][] = [
  [/oá/g, "óa"], [/oà/g, "òa"], [/oả/g, "ỏa"], [/oã/g, "õa"], [/oạ/g, "ọa"],
  [/oé/g, "óe"], [/oè/g, "òe"], [/oẻ/g, "ỏe"], [/oẽ/g, "õe"], [/oẹ/g, "ọe"],
  [/uý/g, "úy"], [/uỳ/g, "ùy"], [/uỷ/g, "ủy"], [/uỹ/g, "ũy"], [/uỵ/g, "ụy"],
]

/** Viết thường, gộp dấu thanh, bỏ số thứ tự đầu câu và ký tự không phải chữ/số. */
export function normalizeHeader(raw: string): string {
  let s = raw.normalize("NFC").toLowerCase()
  for (const [re, to] of TONE_VARIANTS) s = s.replace(re, to)
  return s
    .replace(/^\s*(?:câu\s*)?\d{1,3}\s*[.):-]\s*/u, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

/** Bỏ dấu hoàn toàn — chỉ dùng khi tiêu đề trong tệp được gõ không dấu. */
function stripMarks(s: string): string {
  return s.normalize("NFD").replace(/\p{M}+/gu, "").replace(/đ/g, "d")
}

/** Điểm khớp tiêu đề ↔ trường: trùng khít > chứa nguyên cụm (cụm dài hơn thắng) > 0. */
function scoreHeader(header: string, field: number): number {
  const h = normalizeHeader(header)
  if (!h) return 0
  const plain = stripMarks(h) === h
  const def = SURVEY_COLUMNS[field]!
  let best = 0
  for (const alias of [def.label, ...def.aliases]) {
    let a = normalizeHeader(alias)
    let target = h
    let weight = 1
    if (plain) {
      a = stripMarks(a)
      target = stripMarks(h)
      weight = 0.5
    }
    if (a.length < 2) continue
    if (target === a) best = Math.max(best, 1000 + a.length)
    else if (` ${target} `.includes(` ${a} `)) best = Math.max(best, a.length * weight)
  }
  return best
}

/**
 * Tự ghép cột theo tên tiêu đề (tham lam: cặp điểm cao nhất trước, hoà thì ưu tiên cột
 * gần vị trí gốc). Nếu phần lớn trường khớp tên nằm đúng cột gốc (hoặc không tiêu đề nào
 * nhận ra mà tệp đủ 75 cột) thì coi là bố cục gốc: trường chưa ghép lấy cột gốc nếu trống.
 */
export function detectColumnMapping(headers: readonly string[]): DetectedMapping {
  const pairs: { col: number; field: number; score: number }[] = []
  headers.forEach((header, col) => {
    for (let field = 0; field < FIELD_COUNT; field++) {
      const score = scoreHeader(header, field)
      if (score > 0) pairs.push({ col, field, score })
    }
  })
  pairs.sort((x, y) => y.score - x.score || Math.abs(x.col - x.field) - Math.abs(y.col - y.field))

  const mapping: ColumnMapping = Array.from({ length: FIELD_COUNT }, () => null)
  const source: MatchSource[] = Array.from({ length: FIELD_COUNT }, () => null)
  const usedCols = new Set<number>()
  for (const { col, field } of pairs) {
    if (mapping[field] !== null || usedCols.has(col)) continue
    mapping[field] = col
    source[field] = "header"
    usedCols.add(col)
  }

  const matched = mapping.filter((col): col is number => col !== null)
  const aligned = mapping.filter((col, field) => col === field).length
  const originalLayout = matched.length === 0 ? headers.length >= FIELD_COUNT : aligned / matched.length >= ORIGINAL_LAYOUT_RATIO
  if (originalLayout) {
    for (let field = 0; field < FIELD_COUNT && field < headers.length; field++) {
      if (mapping[field] !== null || usedCols.has(field)) continue
      mapping[field] = field
      source[field] = "position"
      usedCols.add(field)
    }
  }
  return { mapping, source }
}

/** Câu báo lỗi nếu bảng ghép không hợp lệ với tệp có `columnCount` cột; hợp lệ → null. */
export function validateColumnMapping(mapping: readonly (number | null)[], columnCount: number): string | null {
  if (mapping.length !== FIELD_COUNT) return "Bảng ghép cột không hợp lệ"
  const seen = new Set<number>()
  for (let field = 0; field < FIELD_COUNT; field++) {
    const col = mapping[field]
    if (col === null || col === undefined) continue
    if (!Number.isInteger(col) || col < 0 || col >= columnCount) return "Bảng ghép cột trỏ tới cột không có trong tệp"
    if (seen.has(col)) return `Một cột trong tệp đang được ghép cho nhiều trường (${SURVEY_COLUMNS[field]!.label})`
    seen.add(col)
  }
  if (mapping[SHOP_NAME_FIELD] === null || mapping[SHOP_NAME_FIELD] === undefined) return "Chưa chọn cột Tên cửa hàng"
  return null
}

/** Sắp lại một dòng của tệp theo thứ tự 75 trường gốc. */
export function remapRow(row: readonly unknown[], mapping: ColumnMapping): string[] {
  return mapping.map((col) => (col === null ? "" : String(row[col] ?? "")))
}
