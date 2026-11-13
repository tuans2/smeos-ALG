/**
 * URL máy chủ được phép tự tải (ảnh gửi Telegram, ảnh đưa AI đối chiếu): chỉ https, không phải địa
 * chỉ máy nội bộ / metadata đám mây. Chặn SSRF khi URL do tiệm nhập (vd. `attributes.imageUrl`).
 */
export function safeRemoteUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== "https:") return null
    const host = url.hostname.toLowerCase()
    const privateHost =
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host.startsWith("[")
    return privateHost ? null : url.toString()
  } catch {
    return null
  }
}
