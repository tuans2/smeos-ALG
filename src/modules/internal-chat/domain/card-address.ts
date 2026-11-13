/**
 * Địa chỉ giao trên thẻ đơn dạng chữ dễ đọc ("12 Lê Lợi, Phường Bến Nghé, TP Hồ Chí Minh") — trước đây là JSON thô.
 * Không đưa SĐT / tên người mua lên thẻ: đối tác chỉ cần nơi giao và người nhận. Pure TypeScript.
 */

const ADDRESS_KEYS = ["street", "ward", "district", "province", "city"] as const

export function formatCardAddress(raw: unknown): string | undefined {
  if (!raw) return undefined
  if (typeof raw === "string") return raw.trim() || undefined
  if (typeof raw !== "object") return undefined
  const obj = raw as Record<string, unknown>
  const parts: string[] = []
  for (const key of ADDRESS_KEYS) {
    const value = obj[key]
    if (typeof value !== "string") continue
    const text = value.trim()
    // `street` có khi đã là cả địa chỉ ghép sẵn → bỏ phần đã nằm trong chuỗi trước đó
    if (text && !parts.join(", ").toLowerCase().includes(text.toLowerCase())) parts.push(text)
  }
  return parts.length > 0 ? parts.join(", ") : undefined
}
