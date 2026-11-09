/**
 *Proxy use-case — điểm duy nhất orchestrate: giải danh tính → dựng header →
 * gọi sibling → ánh xạ lỗi. Không tự gọi HTTP: đó là việc của adapter.
 *
 * Không cần `organization_id` từ client: core giải từ phiên/SSO/token đã ký,
 * và sibling tự verify JWT/token để lấy tổ chức của chính nó — không có đường
 * nào nhận `organization_id` từ body/query (AGENTS.md, quy ước tenant).
 */

import { AppError } from "@/core/http/errors"
import { readSsoCookie, serializeSsoCookie } from "@/core/http/cookies"
import { env } from "@/lib/env"
import { log } from "@/core/observability/log"
import { resolveSession } from "@/modules/organization/use-cases/resolve-session"
import { ssoClaimsFor, SSO_TOKEN_TTL_SECONDS } from "@/modules/sso/domain/sso-claims"
import { signSsoToken, verifySsoToken } from "@/modules/sso/infra/sso-jwt"
import { proxyTimeoutSignal, proxyRequest, ProxyError, proxyErrorMessage } from "../infra/proxy-http-adapter"
import { requireProxyUrl, isAllowedProxyPath, SSO_HEADER, LEGACY_SSO_HEADER, AUTHORIZATION_HEADER, NO_BODY_METHODS, PROXY_TIMEOUT_MS, type ProxyClient } from "../domain/proxy-rules"

export { ProxyClient }

/** Danh tính core forward sang sibling. Hai đường, SSO thắng khi có cả hai. */
export type ProxyIdentity =
  | { readonly kind: "sso"; readonly value: string }
  | { readonly kind: "token"; readonly value: string }
  | { readonly kind: "none" }

/** Kết quả proxy đã chuẩn hóa để route trả về. */
export type ProxyResult = {
  readonly status: number
  readonly headers: Record<string, string>
  readonly body: string
}

/** Lỗi proxy đã ánh xạ thành AppError. */
export class ProxyRouteError extends AppError {
  constructor(message: string, code: AppError["code"] = "INTERNAL") {
    super(code, message)
    this.name = "ProxyRouteError"
  }
}

/** Đọc danh tính từ request core. Ưu tiên SSO (hẹp hơn), sau token nền.
 *
 * SSO JWT `floraos_sso` core tự đặt cookie host-only "localhost" — trình duyệt
 * tự gửi kèm khi dashboard gọi proxy same-origin, core đọc ở đây rồi forward
 * làm header `X-FloraOS-SSO` sang sibling (sibling verify bằng chính bí mật
 * `SSO_SESSION_SECRET` dùng chung). Không forward cookie session
 * (`floraos_session`) — sibling không cần, và JWT/token là chứng thư đã ký,
 * tự xác minh được.
 */
export function readProxyIdentity(request: Request): ProxyIdentity {
  const ssoHeader = request.headers.get(SSO_HEADER)?.trim() ?? request.headers.get(LEGACY_SSO_HEADER)?.trim()
  if (ssoHeader) return { kind: "sso", value: ssoHeader }

  // Dashboard core không tự gửi JWT — core đọc cookie `smeos_sso` (hoặc legacy) rồi forward.
  const ssoCookie = readSsoCookie(request)
  if (ssoCookie) return { kind: "sso", value: ssoCookie }

  const auth = request.headers.get(AUTHORIZATION_HEADER)?.trim()
  if (auth) return { kind: "token", value: auth }

  return { kind: "none" }
}

/** Dựng headers forward sang sibling. Chỉ forward JWT/token + content-type. */
export function buildForwardHeaders(input: {
  identity: ProxyIdentity
  contentType: string | undefined
  extra: Record<string, string>
}): Record<string, string> {
  const headers: Record<string, string> = {}
  if (input.identity.kind === "sso") {
    headers[SSO_HEADER] = input.identity.value
    headers[LEGACY_SSO_HEADER] = input.identity.value
  } else if (input.identity.kind === "token") {
    headers[AUTHORIZATION_HEADER] = input.identity.value
  }
  if (input.contentType) {
    headers["content-type"] = input.contentType
  }
  for (const [k, v] of Object.entries(input.extra)) {
    headers[k] = v
  }
  return headers
}

/**
 * Gọi sibling qua proxy. `path` bắt đầu bằng `/` (vd. `/api/m04b/background-removal`).
 * Không forward cookie core — sibling tự verify JWT/token.
 */
export async function callProxy(input: {
  client: ProxyClient
  request: Request
  path: string
}): Promise<ProxyResult> {
  const { identity, freshSsoCookieHeader } = await resolveForwardIdentity(input.request)

  const method = input.request.method.toUpperCase()
  const contentType = input.request.headers.get("content-type") ?? undefined
  const body =
    method !== "GET" && method !== "HEAD" && !NO_BODY_METHODS.includes(method)
      ? await input.request.text()
      : null

  const res = await sendToSibling({ client: input.client, identity, method, path: input.path, contentType, body })
  const returnHeaders = { ...res.headers }
  if (freshSsoCookieHeader) {
    returnHeaders["set-cookie"] = freshSsoCookieHeader
  }
  return { status: res.status, headers: returnHeaders, body: res.body }
}

/**
 * Gọi sibling từ MÃ PHÍA MÁY CHỦ của core (không phải trình duyệt), thân JSON,
 * cùng danh tính của người đang thao tác trên `request` (25/09/2026 — Chặng 05
 * gọi SocialFlow M07 viết bài). Đường dẫn vẫn phải nằm trong danh sách trắng
 * của proxy. Không 2xx hoặc body không phải JSON → ném `ProxyRouteError`.
 */
export async function callProxyJson(input: {
  client: ProxyClient
  request: Request
  method: "GET" | "POST" | "PUT" | "PATCH"
  path: string
  json?: unknown
}): Promise<unknown> {
  if (!isAllowedProxyPath(input.client, input.path)) {
    throw new ProxyRouteError(`Đường dẫn ${input.path} không nằm trong danh sách proxy của ${input.client}`, "NOT_FOUND")
  }
  const { identity } = await resolveForwardIdentity(input.request)
  if (identity.kind === "none") {
    throw new ProxyRouteError(`Không có danh tính để gọi ${input.client} (thiếu phiên đăng nhập)`, "UNAUTHENTICATED")
  }
  const hasBody = input.method !== "GET" && input.json !== undefined
  const res = await sendToSibling({
    client: input.client,
    identity,
    method: input.method,
    path: input.path,
    contentType: hasBody ? "application/json" : undefined,
    body: hasBody ? JSON.stringify(input.json) : null,
  })
  const err = toProxyError(res, input.client)
  if (err) throw err
  try {
    return JSON.parse(res.body) as unknown
  } catch {
    throw new ProxyRouteError(`[${input.client}] trả body không phải JSON`, "INTERNAL")
  }
}

/**
 * Danh tính forward: SSO/token có sẵn trên request; thiếu hoặc JWT SSO đã hết
 * hạn (15 phút) thì cấp mới từ phiên `floraos_session`.
 */
async function resolveForwardIdentity(
  request: Request
): Promise<{ identity: ProxyIdentity; freshSsoCookieHeader: string | null }> {
  let identity = readProxyIdentity(request)
  let freshSsoCookieHeader: string | null = null

  const isSsoExpired =
    identity.kind === "sso" &&
    identity.value.split(".").length === 3 &&
    verifySsoToken(identity.value, new Date()) === null

  if (identity.kind === "none" || isSsoExpired) {
    try {
      const resolved = await resolveSession(request)
      if (resolved.session.organization_id) {
        const claims = ssoClaimsFor({
          userId: resolved.user.id,
          organizationId: resolved.session.organization_id,
          email: resolved.user.email,
          now: new Date(),
        })
        const freshToken = signSsoToken(claims)
        identity = { kind: "sso", value: freshToken }
        freshSsoCookieHeader = serializeSsoCookie(freshToken, SSO_TOKEN_TTL_SECONDS)
      }
    } catch {
      // Bỏ qua nếu không có phiên
    }
  }
  return { identity, freshSsoCookieHeader }
}

/** Một lượt HTTP sang sibling, có timeout; lỗi mạng/timeout → `ProxyRouteError`. */
async function sendToSibling(input: {
  client: ProxyClient
  identity: ProxyIdentity
  method: string
  path: string
  contentType: string | undefined
  body: string | null
}): Promise<ProxyResult> {
  const baseUrl = requireProxyUrl(
    input.client,
    input.client === "SOCIALFLOW" ? env.SOCIALFLOW_URL : env.LOCALBUDD_URL
  )
  const headers = buildForwardHeaders({
    identity: input.identity,
    contentType: input.contentType,
    extra: { accept: "application/json" },
  })

  const { signal, cancel } = proxyTimeoutSignal()
  try {
    return await proxyRequest({
      client: input.client,
      baseUrl,
      method: input.method,
      path: input.path,
      headers,
      body: input.body,
      signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ProxyRouteError(`Proxy sang ${input.client} timeout sau ${Math.round(PROXY_TIMEOUT_MS / 1000)}s`, "INTERNAL")
    }
    // Chi tiết lỗi mạng (có địa chỉ nội bộ của hệ thống đích) chỉ vào log máy chủ, không trả ra trình duyệt (audit API §33).
    log.error("proxy.upstream_failed", { client: input.client, method: input.method, path: input.path, error: err instanceof Error ? err.message : String(err), proxyError: err instanceof ProxyError })
    throw new ProxyRouteError(`Không gọi được ${input.client}, vui lòng thử lại sau`, "INTERNAL")
  } finally {
    cancel()
  }
}

/** Ánh xạ proxy response thành AppError khi không phải 2xx. */
export function toProxyError(res: ProxyResult, client: ProxyClient): ProxyRouteError | null {
  if (res.status >= 200 && res.status < 300) return null
  const message = proxyErrorMessage(res)
  const code: AppError["code"] =
    res.status === 401 || res.status === 403
      ? "UNAUTHENTICATED"
      : res.status === 404
        ? "NOT_FOUND"
        : res.status === 400 || res.status === 422
          ? "VALIDATION_FAILED"
          : "INTERNAL"
  return new ProxyRouteError(`[${client}] ${message}`, code)
}

/** Kiểm proxy response có phải binary (download) không. */
export function isBinaryResponse(headers: Record<string, string>): boolean {
  const ct = headers["content-type"] ?? headers["Content-Type"] ?? ""
  return (
    ct.includes("image/") ||
    ct.includes("application/octet-stream") ||
    ct.includes("application/pdf") ||
    ct.includes("application/zip")
  )
}