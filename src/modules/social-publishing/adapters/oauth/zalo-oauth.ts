/**
 * Kết nối Zalo Official Account qua OAuth v4 có PKCE (Bước 4, PO 08/11/2026). Access token sống ~25 giờ; refresh token
 * sống 3 tháng và CHỈ DÙNG MỘT LẦN — mỗi lần làm mới trả cặp mới, phải lưu ngay (xem `refresh-connection.ts`).
 */
import { callJson, obj, str, type FetchLike } from "../http-call"
import { ZALO_API } from "../zalo-oa-publisher"
import { expiresAt, type AppCredentials, type OAuthTokens } from "./app-config"

const OAUTH = "https://oauth.zaloapp.com/v4/oa"
/** Refresh token Zalo sống 3 tháng. */
const REFRESH_TTL_S = 90 * 24 * 3600

export function zaloAuthorizeUrl(app: AppCredentials, redirectUri: string, state: string, codeChallenge: string): string {
  const q = new URLSearchParams({ app_id: app.id, redirect_uri: redirectUri, code_challenge: codeChallenge, state })
  return `${OAUTH}/permission?${q.toString()}`
}

async function tokenCall(app: AppCredentials, fields: Record<string, string>, fetchImpl: FetchLike, now: Date): Promise<OAuthTokens> {
  const r = await callJson(fetchImpl, "zalo-oa", `${OAUTH}/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: app.secret },
    body: new URLSearchParams({ app_id: app.id, ...fields }).toString(),
  })
  const access = str(r.body.access_token)
  if (!access) throw new Error("Zalo chưa cấp quyền — thử kết nối lại")
  return {
    access_token: access,
    refresh_token: str(r.body.refresh_token),
    access_expires_at: expiresAt(now, r.body.expires_in),
    refresh_expires_at: expiresAt(now, REFRESH_TTL_S),
  }
}

export function zaloTokensFromCode(app: AppCredentials, code: string, verifier: string, fetchImpl: FetchLike = fetch, now = new Date()): Promise<OAuthTokens> {
  return tokenCall(app, { code, code_verifier: verifier, grant_type: "authorization_code" }, fetchImpl, now)
}

export function zaloRefresh(app: AppCredentials, refreshToken: string, fetchImpl: FetchLike = fetch, now = new Date()): Promise<OAuthTokens> {
  return tokenCall(app, { refresh_token: refreshToken, grant_type: "refresh_token" }, fetchImpl, now)
}

/** Mã và tên OA của token vừa cấp. */
export async function zaloOaInfo(accessToken: string, fetchImpl: FetchLike = fetch): Promise<{ id: string; name: string }> {
  const r = await callJson(fetchImpl, "zalo-oa", `${ZALO_API}/oa/getoa`, { method: "GET", headers: { access_token: accessToken } })
  const d = obj(r.body.data)
  const id = str(d.oa_id)
  if (r.body.error !== 0 || !id) throw new Error("Không đọc được thông tin Zalo OA — thử kết nối lại")
  return { id, name: str(d.name) ?? "Zalo OA" }
}
