/**
 * Kết nối TikTok qua Login Kit có PKCE (Bước 4, PO 08/11/2026 — đăng ký ứng dụng ngay). Access token sống 24 giờ,
 * refresh token 365 ngày. Quyền: đọc tên tài khoản + đăng bài (`video.publish` — gồm cả bài ảnh).
 */
import { callJson, obj, str, type FetchLike } from "../http-call"
import { TIKTOK_API } from "../tiktok-publisher"
import { expiresAt, type AppCredentials, type OAuthTokens } from "./app-config"

export const TIKTOK_SCOPES = ["user.info.basic", "video.publish"] as const

export function tiktokAuthorizeUrl(app: AppCredentials, redirectUri: string, state: string, codeChallenge: string): string {
  const q = new URLSearchParams({
    client_key: app.id, scope: TIKTOK_SCOPES.join(","), response_type: "code", redirect_uri: redirectUri, state,
    code_challenge: codeChallenge, code_challenge_method: "S256",
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${q.toString()}`
}

async function tokenCall(app: AppCredentials, fields: Record<string, string>, fetchImpl: FetchLike, now: Date): Promise<OAuthTokens & { open_id: string | null }> {
  const r = await callJson(fetchImpl, "tiktok", `${TIKTOK_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: app.id, client_secret: app.secret, ...fields }).toString(),
  })
  const access = str(r.body.access_token)
  if (!access) throw new Error("TikTok chưa cấp quyền — thử kết nối lại")
  return {
    access_token: access,
    refresh_token: str(r.body.refresh_token),
    access_expires_at: expiresAt(now, r.body.expires_in),
    refresh_expires_at: expiresAt(now, r.body.refresh_expires_in),
    open_id: str(r.body.open_id),
  }
}

export function tiktokTokensFromCode(app: AppCredentials, code: string, verifier: string, redirectUri: string, fetchImpl: FetchLike = fetch, now = new Date()) {
  return tokenCall(app, { code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri }, fetchImpl, now)
}

export function tiktokRefresh(app: AppCredentials, refreshToken: string, fetchImpl: FetchLike = fetch, now = new Date()) {
  return tokenCall(app, { refresh_token: refreshToken, grant_type: "refresh_token" }, fetchImpl, now)
}

export async function tiktokDisplayName(accessToken: string, fetchImpl: FetchLike = fetch): Promise<string> {
  const r = await callJson(fetchImpl, "tiktok", `${TIKTOK_API}/user/info/?fields=display_name`, { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } })
  return str(obj(obj(r.body.data).user).display_name) ?? "Tài khoản TikTok"
}
