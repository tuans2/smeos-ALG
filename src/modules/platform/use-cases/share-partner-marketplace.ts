/**
 * Link chia sẻ chợ đối tác (PO 01/11/2026). Tạo / huỷ / liệt kê cần `N17` và ghi nhật ký
 * nền tảng. Xem qua link: không phiên — token phải còn hạn và chưa huỷ; mọi trường hợp
 * không hợp lệ đều trả 404 như nhau (không lộ link từng tồn tại). Dữ liệu luôn đã che.
 */
import { createHash, randomBytes } from "node:crypto"

import { notFound, unprocessable } from "@/core/http/errors"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import type { PlatformContext } from "@/core/platform/platform-context"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { recordPlatformAuditLog } from "../infra/platform-audit-repository"
import { getPartnerMarketplaceRepository } from "../infra/partner-marketplace-repository"
import { getPartnerMarketplaceShareLinkRepository } from "../infra/partner-marketplace-share-link-repository"
import type { ListMarketplaceStoresResult } from "../domain/partner-marketplace-filter"
import {
  SHARE_LINK_LABEL_MAX,
  SHARE_LINK_MAX_DAYS,
  SHARE_LINK_MIN_DAYS,
  SHARE_TOKEN_PATTERN,
  isValidShareLinkDays,
  shareLinkExpiry,
  shareLinkStatus,
  type ShareLinkRecord,
  type ShareLinkStatus,
} from "../domain/partner-marketplace-share-link"
import type { IPartnerMarketplaceShareLinkRepository } from "../domain/repositories/partner-marketplace-share-link-repository.interface"
import { listMaskedStores, type MarketplaceDeps } from "./manage-partner-marketplace"

export type ShareDeps = Pick<MarketplaceDeps, "repo" | "storage" | "audit"> & {
  links: IPartnerMarketplaceShareLinkRepository
  now: () => Date
  newToken: () => string
}

function defaultDeps(): ShareDeps {
  return {
    repo: getPartnerMarketplaceRepository(),
    storage: getStorageProvider(),
    audit: recordPlatformAuditLog,
    links: getPartnerMarketplaceShareLinkRepository(),
    now: () => new Date(),
    newToken: () => randomBytes(32).toString("base64url"),
  }
}

export const hashShareToken = (token: string): string => createHash("sha256").update(token).digest("hex")

export type ShareLinkView = Omit<ShareLinkRecord, "createdBy"> & { status: ShareLinkStatus }

const toView = ({ createdBy: _by, ...link }: ShareLinkRecord, now: Date): ShareLinkView => ({
  ...link,
  status: shareLinkStatus(link, now),
})

export const SHARE_LINK_LIST_LIMIT = 100

export async function listShareLinks(pctx: PlatformContext, deps: ShareDeps = defaultDeps()): Promise<ShareLinkView[]> {
  requirePlatformCapability(pctx, "N17")
  const now = deps.now()
  return (await deps.links.list(SHARE_LINK_LIST_LIMIT)).map((l) => toView(l, now))
}

/** Token gốc chỉ trả về MỘT lần lúc tạo — sau đó chỉ còn bản băm. */
export async function createShareLink(
  pctx: PlatformContext,
  input: { label: string; days: number },
  deps: ShareDeps = defaultDeps()
): Promise<{ link: ShareLinkView; token: string }> {
  requirePlatformCapability(pctx, "N17")
  const label = input.label.trim()
  if (!label || label.length > SHARE_LINK_LABEL_MAX) throw unprocessable(`Ghi chú cần từ 1 đến ${SHARE_LINK_LABEL_MAX} ký tự`)
  if (!isValidShareLinkDays(input.days)) {
    throw unprocessable(`Thời hạn từ ${SHARE_LINK_MIN_DAYS} đến ${SHARE_LINK_MAX_DAYS} ngày`)
  }
  const now = deps.now()
  const token = deps.newToken()
  const link = await deps.links.create({
    tokenHash: hashShareToken(token),
    label,
    expiresAt: shareLinkExpiry(now, input.days),
    createdBy: pctx.userId,
  })
  await deps.audit(pctx, {
    action: "platform.marketplace.share_link_create",
    entityType: "partner_marketplace_share_links",
    entityId: link.id,
    after: { label, days: input.days, expiresAt: link.expiresAt.toISOString() },
  })
  return { link: toView(link, now), token }
}

export async function revokeShareLink(pctx: PlatformContext, id: string, deps: ShareDeps = defaultDeps()): Promise<ShareLinkView> {
  requirePlatformCapability(pctx, "N17")
  const link = await deps.links.findById(id)
  if (!link) throw notFound()
  const now = deps.now()
  if (!link.revokedAt) {
    await deps.links.revoke(id, now)
    await deps.audit(pctx, {
      action: "platform.marketplace.share_link_revoke",
      entityType: "partner_marketplace_share_links",
      entityId: id,
      before: { label: link.label },
    })
  }
  return toView({ ...link, revokedAt: link.revokedAt ?? now }, now)
}

/** Xem công khai: token sai / hết hạn / đã huỷ → 404 như nhau. */
export async function viewSharedMarketplace(
  token: string,
  deps: ShareDeps = defaultDeps()
): Promise<ListMarketplaceStoresResult & { expiresAt: Date }> {
  if (!SHARE_TOKEN_PATTERN.test(token)) throw notFound()
  const link = await deps.links.findByTokenHash(hashShareToken(token))
  const now = deps.now()
  if (!link || shareLinkStatus(link, now) !== "ACTIVE") throw notFound()
  await deps.links.recordView(link.id, now)
  // Không nhận bộ lọc phía máy chủ: tìm trên chuỗi gốc sẽ cho dò ngược SĐT / tên đã che.
  const result = await listMaskedStores({}, deps)
  return { ...result, expiresAt: link.expiresAt }
}
