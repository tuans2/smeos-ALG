import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { ShareLinkRepository, getShareLinkRepository } from "../infra/share-link-repository"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { GreetingMessageRepository, getGreetingMessageRepository } from "../infra/greeting-message-repository"
import { linkExpiryFrom, parseLinkLifetimeHours } from "../domain/link-lifetime"
import { resolveEffectiveStepTimeoutPolicy } from "../domain/step-timeout-policy"
import { normalizeChannel, DIRECT_CHANNEL, channelLabel } from "../domain/catalog-channel"
import { LINK_COPIED_EVENT, SHARE_CODE_REGEX, parseDefaultOwnerId, resolveDefaultOwner } from "../domain/link-ownership"
import { resolveSaleScope } from "./order-scope"
import { assertShopReadyForCustomers } from "./get-shop-contact"

/**
 * Bấm "Sao chép" link bộ sưu tập: tạo link `/s/<mã>` mang tên người đang đăng nhập.
 * Mọi khách mở link này đều tính cho người đó, tính giờ từ lúc khách mở.
 */
export async function createShareLink(ctx: TenantContext, input: { catalogId: string; channel?: string | null | undefined }, repo = getShareLinkRepository()) {
  await assertShopReadyForCustomers(ctx.organizationId)
  const channel = normalizeChannel(input.channel)
  const link = await repo.create(ctx, { catalogId: input.catalogId, channel: channel === DIRECT_CHANNEL ? null : channel })
  return { code: link.code, path: `/s/${link.code}`, createdAt: link.created_at.toISOString() }
}

/** Link đã sao chép (sale "chỉ khách của mình" chỉ thấy link của mình) kèm số khách mở và số đơn. */
export async function listShareLinks(ctx: TenantContext, repo = getShareLinkRepository()) {
  const scope = await resolveSaleScope(ctx)
  const [rows, members] = await Promise.all([repo.listWithStats(ctx, scope), getGreetingMessageRepository().activeMembers(ctx)])
  const names = new Map(members.map((m) => [m.userId, m.name]))
  return rows.map((r) => ({
    code: r.code, path: `/s/${r.code}`, catalogName: r.catalog.name, ownerName: names.get(r.owner_id) ?? "Nhân viên đã rời",
    channel: r.channel ? channelLabel(r.channel) : null, copiedAt: r.created_at.toISOString(), revoked: !!r.revoked_at,
    opens: r.opens, orders: r.orders,
  }))
}

/**
 * Khách mở `/s/<mã>`: mỗi khách một phiên riêng (giữ lại qua cookie để tải lại không tạo phiên mới).
 * Trả mã phiên `/b/<sendCode>` để chuyển tiếp, hoặc `null` khi link không còn hiệu lực.
 */
export async function openShareLink(code: string, knownSendCode: string | null, repo = getShareLinkRepository()) {
  if (!SHARE_CODE_REGEX.test(code)) return null
  const link = await repo.findActive(code)
  if (!link) return null
  if (knownSendCode) {
    const existing = await repo.existingVisitorSession(link.organization_id, knownSendCode)
    if (existing) return { sendCode: existing.send_code, sessionId: existing.id, organizationId: link.organization_id, catalogId: link.catalog_id }
  }
  // Mỗi khách có hạn riêng tính từ lúc mở, theo cài đặt của tiệm / bộ sưu tập
  const shop = await getGreetingCardRepository().getShopProfile(link.organization_id)
  const effectivePolicy = resolveEffectiveStepTimeoutPolicy(shop.settings, link.catalog?.filters)
  const explicitLifetime = parseLinkLifetimeHours(shop.settings)
  const hasExplicitSetting = (shop.settings && typeof shop.settings === "object"
    ? (shop.settings as Record<string, unknown>)["brochure_link_lifetime_hours"]
    : undefined) !== undefined
  const expiryHours = hasExplicitSetting
    ? explicitLifetime
    : effectivePolicy.autoCancelBrowsing
      ? effectivePolicy.browsingExpiryHours
      : explicitLifetime
  const session = await repo.openVisitorSession(link, linkExpiryFrom(expiryHours))
  return { sendCode: session.send_code, sessionId: session.id, organizationId: link.organization_id, catalogId: link.catalog_id }
}

/** Thông tin xem trước của link (tiêu đề, ảnh) — trả về cho mọi bên mở link, không tạo phiên. */
export async function shareLinkPreview(code: string, repo = getShareLinkRepository()) {
  if (!SHARE_CODE_REGEX.test(code)) return null
  const link = await repo.findActive(code)
  if (!link) return null
  const catalog = await repo.catalogPreview(link.catalog_id)
  return catalog ? { catalogId: link.catalog_id, name: catalog.name, description: catalog.description } : null
}

/** Sale sao chép link riêng gửi khách: ghi mốc gửi lần đầu (bắt đầu tính "khách chưa mở"). */
export async function markSendLinkCopied(ctx: TenantContext, sendCode: string, repo = getGreetingCardRepository()) {
  const session = await getShareLinkRepository().sessionForCopy(ctx, sendCode)
  const scope = await resolveSaleScope(ctx)
  if (!session || (scope && session.sale_id !== scope)) throw notFound()
  if (session.events.length === 0) await repo.recordJourneyEvent(ctx.organizationId, session.id, LINK_COPIED_EVENT, { copiedBy: ctx.userId })
  return { copied: true }
}

/** Người phụ trách đơn đến từ link cũ (không qua nút Sao chép): Điều hành chọn, mặc định chủ tiệm. */
export async function defaultOwnerOf(organizationId: string, repo = getShareLinkRepository()): Promise<string | null> {
  const c = await repo.ownerCandidates(organizationId)
  return resolveDefaultOwner(parseDefaultOwnerId(c.settings), c.activeMemberIds, c.founderId)
}
