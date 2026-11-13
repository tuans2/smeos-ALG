/**
 * Gửi ảnh Telegram bằng tệp tải lên (multipart) khi Telegram không tự tải được URL ảnh — vd. ảnh qua
 * proxy Google Drive chậm hoặc ảnh quá 5 MB (giới hạn của sendPhoto theo URL). Trước 23/10/2026 khi
 * đó tin chỉ còn chữ dù trang Thẻ Gia Công vẫn hiện ảnh.
 * Chống SSRF: máy chủ CHỈ tự tải ảnh từ chính ứng dụng (`publicAppUrl`) hoặc kho ảnh (`STORAGE_ENDPOINT`),
 * không bao giờ tải URL tuỳ ý do tiệm nhập; không theo chuyển hướng; trần 10 MB; chỉ nhận `image/*`.
 */
import { publicAppUrl } from "@/lib/public-url"
import { safeRemoteUrl } from "@/lib/safe-remote-url"

const MAX_BYTES = 10 * 1024 * 1024
const TIMEOUT_MS = 15000

function hostOf(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** URL ảnh thuộc hệ thống mình (ứng dụng hoặc kho ảnh) nên máy chủ được tự tải, ngược lại `null`. */
export function ownPhotoUrl(raw: string | null | undefined): string | null {
  const safe = safeRemoteUrl(raw)
  if (!safe) return null
  const host = new URL(safe).hostname.toLowerCase()
  const appHost = hostOf(publicAppUrl())
  const storageHost = hostOf(process.env.STORAGE_ENDPOINT?.trim())
  const allowed = host === appHost || (storageHost !== null && (host === storageHost || host.endsWith(`.${storageHost}`)))
  return allowed ? safe : null
}

export async function uploadTelegramPhoto(
  botToken: string,
  payload: { chatId: string; photoUrl: string; caption: string; replyMarkup?: unknown }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const url = ownPhotoUrl(payload.photoUrl)
  if (!url) return { ok: false, error: "photo_url_not_own" }

  const img = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) })
  const type = img.headers.get("content-type") ?? ""
  if (!img.ok || !type.startsWith("image/")) return { ok: false, error: `photo_fetch_${img.status}` }
  const bytes = await img.arrayBuffer()
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return { ok: false, error: "photo_size" }

  const form = new FormData()
  form.append("chat_id", payload.chatId)
  form.append("photo", new Blob([bytes], { type }), "mau-hoa.jpg")
  form.append("caption", payload.caption)
  form.append("parse_mode", "HTML")
  if (payload.replyMarkup) form.append("reply_markup", JSON.stringify(payload.replyMarkup))

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string }
  if (!data.ok) return { ok: false, error: data.description ?? "send_photo_failed" }
  return { ok: true, ...(data.result ? { messageId: data.result.message_id } : {}) }
}
