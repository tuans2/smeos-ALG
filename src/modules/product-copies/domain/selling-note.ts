/**
 * Rút gọn dữ liệu bán hàng ĐÃ DUYỆT của một sản phẩm thành một ghi chú ngắn cho prompt
 * Landing (08) / Catalog (09) của content engine. Thuần — không Prisma, không mạng.
 */

import type { ProductCopyEffective } from "./product-copy-rules"

export const SELLING_NOTE_MAX_CHARS = 320

function clean(s: unknown): string {
  return typeof s === "string" ? s.replace(/\s+/g, " ").trim() : ""
}

/** Ghép mô tả, phong cách, điểm bán và ý nghĩa loài hoa; cắt theo trần ký tự để không phình prompt. */
export function toSellingNote(copy: ProductCopyEffective): string {
  const parts = [
    clean(copy.suggested_description),
    clean(copy.suggested_style) && `Phong cách: ${clean(copy.suggested_style)}`,
    (copy.key_selling_points ?? []).map(clean).filter(Boolean).slice(0, 3).join("; "),
    clean(copy.flower_meaning_story) && `Ý nghĩa: ${clean(copy.flower_meaning_story)}`,
  ].filter(Boolean)
  const note = parts.join(". ")
  return note.length > SELLING_NOTE_MAX_CHARS ? `${note.slice(0, SELLING_NOTE_MAX_CHARS - 1)}…` : note
}
