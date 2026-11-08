import { log } from "@/core/observability/log"
import type { FetchLike } from "../adapters/http-call"
import { appCredentials } from "../adapters/oauth/app-config"
import { tiktokRefresh } from "../adapters/oauth/tiktok-oauth"
import { zaloRefresh } from "../adapters/oauth/zalo-oauth"
import { findActiveConnection, saveRefreshedBundle, type ActiveConnection, type CredentialBundle } from "../infra/channel-connections"

/**
 * Làm mới access token sắp hết hạn (Zalo ~25 giờ, TikTok 24 giờ) trước khi đăng. Refresh token của Zalo CHỈ DÙNG MỘT LẦN:
 * cặp mới phải lưu ngay — lưu theo khoá lạc quan; nếu tiến trình khác đã làm mới trước (lưu không được), đọc lại khoá
 * họ vừa lưu thay vì dùng refresh token đã cũ. Facebook/Instagram dùng Page token không hết hạn → không làm mới.
 * Hỏng → `null` (bài dừng với lý do "kết nối hết hạn", kết nối được đánh dấu để user kết nối lại).
 */
export async function refreshConnection(conn: ActiveConnection, fetchImpl: FetchLike = fetch, now: Date = new Date()): Promise<CredentialBundle | null> {
  const refreshToken = conn.bundle.refresh_token
  if (!refreshToken || (conn.channel !== "zalo" && conn.channel !== "tiktok")) return null
  const app = appCredentials(conn.channel)
  if (!app) return null
  try {
    const tokens = conn.channel === "zalo" ? await zaloRefresh(app, refreshToken, fetchImpl, now) : await tiktokRefresh(app, refreshToken, fetchImpl, now)
    const bundle: CredentialBundle = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? refreshToken,
      access_expires_at: tokens.access_expires_at,
      refresh_expires_at: tokens.refresh_expires_at ?? conn.bundle.refresh_expires_at ?? null,
    }
    if (await saveRefreshedBundle(conn, bundle)) return bundle
    const latest = await findActiveConnection(conn.organizationId, conn.channel)
    return latest && latest.bundle.access_token !== conn.bundle.access_token ? latest.bundle : null
  } catch (e) {
    log.warn("social_publish.refresh_failed", { feature: "social-publishing", channel: conn.channel, error: e instanceof Error ? e.name : "unknown" })
    return null
  }
}
