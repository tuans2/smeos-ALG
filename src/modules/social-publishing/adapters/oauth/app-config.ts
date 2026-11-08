/**
 * Khoá ỨNG DỤNG cấp nền tảng cho kết nối đăng bài (Meta, Zalo, TikTok — PO 08/11/2026: đăng ký ứng dụng mới). Cửa hàng
 * không tự nhập khoá; chỉ bấm "Kết nối" rồi đồng ý trên trang của nền tảng. Thiếu khoá → kênh "chưa mở".
 */
import { createHash, randomBytes } from "node:crypto"
import type { SocialChannel } from "@/core/ports/publisher-provider"

export interface AppCredentials {
  readonly id: string
  readonly secret: string
}

/** Instagram dùng chung ứng dụng Meta với Facebook. */
export function appCredentials(channel: SocialChannel, source: NodeJS.ProcessEnv = process.env): AppCredentials | null {
  const pick = (id?: string, secret?: string) => (id && secret ? { id, secret } : null)
  if (channel === "facebook" || channel === "instagram") return pick(source.META_APP_ID, source.META_APP_SECRET)
  if (channel === "zalo") return pick(source.ZALO_SOCIAL_APP_ID, source.ZALO_SOCIAL_APP_SECRET)
  return pick(source.TIKTOK_CLIENT_KEY, source.TIKTOK_CLIENT_SECRET)
}

/** PKCE (RFC 7636, S256) — Zalo v4 và TikTok yêu cầu / khuyến nghị. */
export function newPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url")
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") }
}

/** Khoá đã đổi được từ nền tảng (cùng hình dạng `CredentialBundle` lưu trong kho bí mật). */
export interface OAuthTokens {
  readonly access_token: string
  readonly refresh_token: string | null
  readonly access_expires_at: string | null
  readonly refresh_expires_at: string | null
}

export const expiresAt = (now: Date, seconds: unknown): string | null =>
  typeof seconds === "number" && seconds > 0 ? new Date(now.getTime() + seconds * 1000).toISOString() : typeof seconds === "string" && Number(seconds) > 0 ? new Date(now.getTime() + Number(seconds) * 1000).toISOString() : null
