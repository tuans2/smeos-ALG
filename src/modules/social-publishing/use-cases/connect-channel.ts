import { conflict, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import type { SocialChannel } from "@/core/ports/publisher-provider"
import { openSecret, sealSecret } from "@/core/security/secret-box"
import { publicAppUrl } from "@/lib/public-url"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { loadOrgProfile } from "@/modules/integration-hub/infra/org-profile"
import type { FetchLike } from "../adapters/http-call"
import { appCredentials, newPkce } from "../adapters/oauth/app-config"
import { metaAuthorizeUrl, metaPagesFromCode, type MetaPage } from "../adapters/oauth/meta-oauth"
import { tiktokAuthorizeUrl, tiktokDisplayName, tiktokTokensFromCode } from "../adapters/oauth/tiktok-oauth"
import { zaloAuthorizeUrl, zaloOaInfo, zaloTokensFromCode } from "../adapters/oauth/zalo-oauth"
import { CHANNEL_RULES } from "../domain/channel-rules"
import { disconnectChannel, readPendingFacebook, saveConnection } from "../infra/channel-connections"

const STATE_PURPOSE = "social-oauth-state"
const STATE_TTL_MS = 10 * 60_000

/** Instagram kết nối qua chính luồng Facebook (Instagram Business gắn với Trang). */
const flowOf = (c: SocialChannel): SocialChannel => (c === "instagram" ? "facebook" : c)

interface OAuthState { readonly o: string; readonly u: string; readonly c: SocialChannel; readonly v: string | null; readonly e: number }

/** Địa chỉ nền tảng gọi về sau khi user đồng ý — phải khai đúng địa chỉ này trong cài đặt ứng dụng. */
export function callbackUrl(channel: SocialChannel): string {
  const base = publicAppUrl()
  if (!base) throw conflict("Chưa cấu hình địa chỉ công khai của hệ thống (PUBLIC_APP_URL)")
  return `${base}/api/v1/social-publishing/channels/${flowOf(channel)}/callback`
}

/** Bắt đầu kết nối (W2): trả link trang đồng ý của nền tảng, `state` mã hoá gắn tổ chức + người + hạn 10 phút. */
export async function startConnect(ctx: TenantContext, channel: SocialChannel, now: Date = new Date()): Promise<{ authorize_url: string }> {
  requireCapability(ctx, "W2")
  const flow = flowOf(channel)
  const app = appCredentials(flow)
  if (!app) throw conflict(`Kênh ${CHANNEL_RULES[channel].label} chưa mở — quản trị hệ thống cần đăng ký ứng dụng trước`)
  const pkce = flow === "facebook" ? null : newPkce()
  const state = sealSecret(JSON.stringify({ o: ctx.organizationId, u: ctx.userId, c: flow, v: pkce?.verifier ?? null, e: now.getTime() + STATE_TTL_MS } satisfies OAuthState), STATE_PURPOSE)
  const redirect = callbackUrl(flow)
  const url = flow === "facebook" ? metaAuthorizeUrl(app, redirect, state)
    : flow === "zalo" ? zaloAuthorizeUrl(app, redirect, state, pkce!.challenge)
      : tiktokAuthorizeUrl(app, redirect, state, pkce!.challenge)
  return { authorize_url: url }
}

function readState(ctx: TenantContext, channel: SocialChannel, raw: string, now: Date): OAuthState {
  let s: OAuthState
  try {
    s = JSON.parse(openSecret(raw, STATE_PURPOSE)) as OAuthState
  } catch {
    throw validationFailed({ state: "Phiên kết nối không hợp lệ — bấm Kết nối lại" })
  }
  // Chống giả mạo: đúng tổ chức, đúng người đã bấm, đúng kênh, còn hạn
  if (s.o !== ctx.organizationId || s.u !== ctx.userId || s.c !== channel) throw validationFailed({ state: "Phiên kết nối không khớp tài khoản đang đăng nhập" })
  if (s.e < now.getTime()) throw validationFailed({ state: "Phiên kết nối đã hết hạn — bấm Kết nối lại" })
  return s
}

async function connectPage(ctx: TenantContext, page: MetaPage, scopeTier: string): Promise<SocialChannel[]> {
  await saveConnection(ctx, { channel: "facebook", scopeTier, accountId: page.id, displayName: page.name, bundle: { access_token: page.accessToken }, status: "ACTIVE" })
  if (!page.instagramId) return ["facebook"]
  await saveConnection(ctx, {
    channel: "instagram", scopeTier, accountId: page.instagramId, displayName: page.instagramUsername ? `@${page.instagramUsername}` : page.name,
    bundle: { access_token: page.accessToken }, status: "ACTIVE",
  })
  return ["facebook", "instagram"]
}

export interface PendingPage { readonly id: string; readonly name: string; readonly has_instagram: boolean }

export type FinishResult = { readonly connected: SocialChannel[] } | { readonly pending_pages: PendingPage[] }

/** Nền tảng gọi về (W2): kiểm `state`, đổi mã lấy khoá, lưu kết nối. Facebook nhiều Trang → chờ user chọn. */
export async function finishConnect(
  ctx: TenantContext, channel: SocialChannel, input: { code: string | null; state: string | null; error: string | null },
  fetchImpl: FetchLike = fetch, now: Date = new Date(),
): Promise<FinishResult> {
  requireCapability(ctx, "W2")
  if (input.error || !input.code || !input.state) throw validationFailed({ code: "Bạn chưa đồng ý cấp quyền trên trang của nền tảng" })
  const s = readState(ctx, channel, input.state, now)
  const app = appCredentials(channel)
  if (!app) throw conflict(`Kênh ${CHANNEL_RULES[channel].label} chưa mở`)
  const { tier } = await loadOrgProfile(ctx)
  const redirect = callbackUrl(channel)
  let connected: SocialChannel[]

  if (channel === "facebook") {
    const pages = await metaPagesFromCode(app, input.code, redirect, fetchImpl)
    if (pages.length === 0) throw validationFailed({ code: "Tài khoản Facebook này chưa quản lý Trang nào" })
    if (pages.length > 1) {
      await saveConnection(ctx, { channel: "facebook", scopeTier: tier, accountId: "", displayName: "Chờ chọn Trang", bundle: { access_token: JSON.stringify(pages) }, status: "CONNECTING" })
      return { pending_pages: pages.map((p) => ({ id: p.id, name: p.name, has_instagram: Boolean(p.instagramId) })) }
    }
    connected = await connectPage(ctx, pages[0]!, tier)
  } else if (channel === "zalo") {
    const tokens = await zaloTokensFromCode(app, input.code, s.v ?? "", fetchImpl, now)
    const oa = await zaloOaInfo(tokens.access_token, fetchImpl)
    await saveConnection(ctx, { channel, scopeTier: tier, accountId: oa.id, displayName: oa.name, bundle: tokens, status: "ACTIVE" })
    connected = ["zalo"]
  } else {
    const tokens = await tiktokTokensFromCode(app, input.code, s.v ?? "", redirect, fetchImpl, now)
    if (!tokens.open_id) throw validationFailed({ code: "TikTok chưa trả mã tài khoản — thử kết nối lại" })
    const name = await tiktokDisplayName(tokens.access_token, fetchImpl).catch(() => "Tài khoản TikTok")
    const { open_id: openId, ...bundle } = tokens
    await saveConnection(ctx, { channel, scopeTier: tier, accountId: openId, displayName: name, bundle, status: "ACTIVE" })
    connected = ["tiktok"]
  }
  await recordAuditLog(ctx, { action: "social_channel.connect", entityType: "integration_connections", entityId: connected.join(","), after: { channels: connected } })
  return { connected }
}

function pendingPages(json: string): MetaPage[] {
  try {
    const v = JSON.parse(json) as MetaPage[]
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** Các Trang đang chờ chọn (không trả Page token). */
export async function listPendingPages(ctx: TenantContext): Promise<PendingPage[]> {
  requireCapability(ctx, "W2")
  const pending = await readPendingFacebook(ctx)
  return pending ? pendingPages(pending.pagesJson).map((p) => ({ id: p.id, name: p.name, has_instagram: Boolean(p.instagramId) })) : []
}

/** User chọn Trang (W2) — kết nối Facebook (+ Instagram nếu Trang có gắn), dòng chờ tự ngắt. */
export async function selectFacebookPage(ctx: TenantContext, pageId: string): Promise<{ connected: SocialChannel[] }> {
  requireCapability(ctx, "W2")
  const pending = await readPendingFacebook(ctx)
  const page = pending ? pendingPages(pending.pagesJson).find((p) => p.id === pageId) : undefined
  if (!page) throw validationFailed({ page_id: "Trang không có trong danh sách chờ — bấm Kết nối lại" })
  const { tier } = await loadOrgProfile(ctx)
  const connected = await connectPage(ctx, page, tier)
  await recordAuditLog(ctx, { action: "social_channel.connect", entityType: "integration_connections", entityId: page.id, after: { channels: connected } })
  return { connected }
}

/** Ngắt kết nối một kênh (W2). Bài đang chờ của kênh đó sẽ dừng với lý do "chưa kết nối" ở lượt đăng. */
export async function disconnect(ctx: TenantContext, channel: SocialChannel): Promise<void> {
  requireCapability(ctx, "W2")
  await disconnectChannel(ctx, channel)
  await recordAuditLog(ctx, { action: "social_channel.disconnect", entityType: "integration_connections", entityId: channel, after: { channel } })
}
