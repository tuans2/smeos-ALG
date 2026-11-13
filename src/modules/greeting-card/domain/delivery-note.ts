/**
 * Ghi chú cho người giao hoa + link Google Maps khách dán (PO 08/10/2026). Tách khỏi ghi chú
 * cho thợ cắm hoa (`senderNote`) và lời nhắn thiệp. Lưu trong `orders.delivery_address`
 * (`notes`, `mapUrl`) — đi cùng địa chỉ tới shipper, không cần cột mới. Pure TypeScript.
 */

export const DELIVERY_NOTE_MAX = 300
export const MAP_URL_MAX = 2000

/** Chỉ nhận link Google Maps — link này hiện thành nút bấm cho nhân viên, không nhận trang lạ. */
const MAP_HOSTS = new Set(["maps.app.goo.gl", "maps.google.com", "maps.google.com.vn", "goo.gl", "google.com", "www.google.com", "google.com.vn", "www.google.com.vn"])
/** Các host dùng chung (không riêng Maps) chỉ nhận đường dẫn bản đồ. */
const SHARED_HOSTS = new Set(["goo.gl", "google.com", "www.google.com", "google.com.vn", "www.google.com.vn"])

/** Link bản đồ đã chuẩn hoá, hoặc `null` nếu không phải link Google Maps hợp lệ. */
export function normalizeMapUrl(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim()
  if (!value || value.length > MAP_URL_MAX) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null
  const host = url.hostname.toLowerCase()
  if (!MAP_HOSTS.has(host)) return null
  if (SHARED_HOSTS.has(host) && !url.pathname.startsWith("/maps")) return null
  if (url.username || url.password || url.port) return null
  return url.toString()
}

/** Lỗi tiếng Việt cho ghi chú giao hàng / link bản đồ; rỗng nếu hợp lệ. Link bỏ trống là hợp lệ. */
export function deliveryNoteErrors(input: { deliveryNote?: string | undefined; mapUrl?: string | undefined }): Record<string, string> {
  const errors: Record<string, string> = {}
  if ((input.deliveryNote?.length ?? 0) > DELIVERY_NOTE_MAX) {
    errors.deliveryNote = `Ghi chú cho người giao hoa tối đa ${DELIVERY_NOTE_MAX} ký tự`
  }
  if (input.mapUrl?.trim() && !normalizeMapUrl(input.mapUrl)) {
    errors.mapUrl = "Link bản đồ chưa đúng. Vui lòng dán link chia sẻ từ Google Maps (bắt đầu bằng https://)"
  }
  return errors
}

/** Phần thêm vào `delivery_address` khi tạo đơn — chỉ có khoá khi khách có nhập. */
export function deliveryNoteFields(input: { deliveryNote?: string | undefined; mapUrl?: string | undefined }): { notes?: string; mapUrl?: string } {
  const notes = input.deliveryNote?.trim()
  const mapUrl = normalizeMapUrl(input.mapUrl)
  return { ...(notes ? { notes } : {}), ...(mapUrl ? { mapUrl } : {}) }
}

/** Đọc lại từ `delivery_address` đã lưu (dữ liệu cũ không có → `null`). */
export function readDeliveryNote(address: unknown): { note: string | null; mapUrl: string | null } {
  const a = address && typeof address === "object" ? (address as Record<string, unknown>) : {}
  const note = typeof a.notes === "string" && a.notes.trim() ? a.notes.trim() : null
  return { note, mapUrl: typeof a.mapUrl === "string" ? normalizeMapUrl(a.mapUrl) : null }
}
