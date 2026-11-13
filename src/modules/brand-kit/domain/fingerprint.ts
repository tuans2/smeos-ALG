/**
 * Dấu hồ sơ (FNV-1a 32 bit) lưu kèm mỗi phương án lúc sinh — so với dấu hiện tại để báo
 * "Hồ sơ đã thay đổi, có muốn tạo lại không?". Không phải băm bảo mật. Thuần.
 */

function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

/** Thứ tự khoá không ảnh hưởng; giá trị rỗng/null coi như nhau. */
export function fingerprintOf(fields: Readonly<Record<string, unknown>>): string {
  const norm = (v: unknown): unknown => {
    if (v === null || v === undefined || v === "") return null
    if (Array.isArray(v)) return v.map(norm)
    if (typeof v === "object") {
      return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, norm((v as Record<string, unknown>)[k])]))
    }
    return typeof v === "string" ? v.trim() : v
  }
  return fnv1a(JSON.stringify(norm(fields)))
}
