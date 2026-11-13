/**
 * `src` của ảnh hiển thị trên trình duyệt khi URL đến từ người dùng/DOM (ảnh vừa chọn, link nhập
 * tay, kết quả API): chỉ nhận `blob:`, `data:image/…`, `http(s):` hoặc đường dẫn tương đối của app.
 * Giao thức khác (vd. `javascript:`) → chuỗi rỗng (CodeQL js/xss-through-dom).
 */
const SAFE_IMAGE_SRC = /^(blob:|data:image\/[a-z0-9.+-]+;|https?:\/\/|\/(?!\/))/i

export function safeImageSrc(raw: string | null | undefined): string {
  if (!raw) return ""
  const value = raw.trim()
  if (!SAFE_IMAGE_SRC.test(value)) return ""
  // Mã hoá ký tự meta HTML — URL hợp lệ không chứa chúng ở dạng thô (không đụng tới & của query ký số)
  return value.replace(/[<>"']/g, (c) => encodeURIComponent(c))
}
