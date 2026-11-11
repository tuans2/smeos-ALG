import { withCircuitBreaker } from "@/core/http/circuit-breaker"
import type { NotifyParams } from "../domain/customer-notifications"

/**
 * Zalo ZNS (Zalo Notification Service) — gửi tin theo mẫu đã duyệt.
 * Tài liệu: https://developers.zalo.me/docs/zalo-notification-service
 *
 * Access token sống ~25 giờ; refresh token DÙNG MỘT LẦN — mỗi lần làm mới
 * phải lưu lại cặp token mới (`updatedCredentials`), nếu không lần sau hỏng.
 */

export interface ZnsCredentials {
  appId: string
  secretKey: string
  accessToken: string
  refreshToken: string
  /** ISO; null = chưa biết → làm mới trước khi gửi. */
  accessTokenExpiresAt: string | null
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

const SEND_URL = "https://business.openapi.zalo.me/message/template"
const TOKEN_URL = "https://oauth.zaloapp.com/v4/oa/access_token"
const TOKEN_ERRORS = new Set([-124, -216, -14014])

async function refresh(creds: ZnsCredentials, fetchImpl: FetchLike, signal: AbortSignal): Promise<ZnsCredentials> {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    signal,
    headers: { secret_key: creds.secretKey, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: creds.refreshToken, app_id: creds.appId, grant_type: "refresh_token" }).toString(),
  })
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: string | number }
  if (!res.ok || !json.access_token || !json.refresh_token) throw new Error("Không làm mới được access token Zalo — cần kết nối lại OA")
  return {
    ...creds,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    accessTokenExpiresAt: new Date(Date.now() + Number(json.expires_in ?? 90_000) * 1000).toISOString(),
  }
}

async function sendOnce(
  creds: ZnsCredentials,
  body: Record<string, unknown>,
  fetchImpl: FetchLike,
  signal: AbortSignal
): Promise<{ error: number; message?: string; msgId?: string }> {
  const res = await fetchImpl(SEND_URL, {
    method: "POST",
    signal,
    headers: { access_token: creds.accessToken, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as { error?: number; message?: string; data?: { msg_id?: string } }
  return { error: json.error ?? (res.ok ? 0 : -1), ...(json.message ? { message: json.message } : {}), ...(json.data?.msg_id ? { msgId: json.data.msg_id } : {}) }
}

export async function sendZnsMessage(
  input: { creds: ZnsCredentials; templateId: string; phone: string; params: NotifyParams | Readonly<Record<string, string>>; trackingId: string },
  fetchImpl: FetchLike = fetch
): Promise<{ messageId: string | null; updatedCredentials: ZnsCredentials | null }> {
  return withCircuitBreaker("zalo-zns", async (signal) => {
    let creds = input.creds
    let refreshed = false
    const expiresAt = creds.accessTokenExpiresAt ? Date.parse(creds.accessTokenExpiresAt) : 0
    if (!expiresAt || expiresAt < Date.now() + 5 * 60_000) {
      creds = await refresh(creds, fetchImpl, signal)
      refreshed = true
    }
    const body = { phone: input.phone, template_id: input.templateId, template_data: input.params, tracking_id: input.trackingId }
    let result = await sendOnce(creds, body, fetchImpl, signal)
    if (TOKEN_ERRORS.has(result.error) && !refreshed) {
      creds = await refresh(creds, fetchImpl, signal)
      refreshed = true
      result = await sendOnce(creds, body, fetchImpl, signal)
    }
    if (result.error !== 0) throw new Error(`Zalo ZNS từ chối (${result.error}): ${result.message ?? "không rõ lý do"}`)
    return { messageId: result.msgId ?? null, updatedCredentials: refreshed ? creds : null }
  })
}
