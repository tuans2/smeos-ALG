/**
 * Ảnh ghép xem trước (OpenGraph) của link công khai tải ảnh sản phẩm từ URL tuyệt đối. URL do nhân viên
 * tiệm nhập nên phải chặn SSRF: chỉ `https`, không cổng lạ, không localhost / IP nội bộ / IP dạng số
 * (metadata đám mây 169.254.169.254, 10.x, 172.16–31.x, 192.168.x, ::1, fc00::/7…).
 */
export function isSafePublicImageUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== "https:" || url.username || url.password) return false
  if (url.port && url.port !== "443") return false
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false
  // Mọi IP dạng số (v4 hoặc v6) đều chặn — ảnh công khai luôn đi qua tên miền
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return false
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return false
  return host.includes(".")
}

/** Giới hạn dung lượng mỗi ảnh tải về cho ảnh ghép (tránh tải tệp khổng lồ). */
export const PUBLIC_IMAGE_MAX_BYTES = 5 * 1024 * 1024
