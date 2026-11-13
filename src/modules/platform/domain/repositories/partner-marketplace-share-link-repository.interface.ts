import type { ShareLinkRecord } from "../partner-marketplace-share-link"

/** Port lưu link chia sẻ chợ đối tác (bảng cấp nền tảng `partner_marketplace_share_links`). */
export interface IPartnerMarketplaceShareLinkRepository {
  create(input: { tokenHash: string; label: string; expiresAt: Date; createdBy: string }): Promise<ShareLinkRecord>
  list(limit: number): Promise<ShareLinkRecord[]>
  findById(id: string): Promise<ShareLinkRecord | null>
  findByTokenHash(tokenHash: string): Promise<ShareLinkRecord | null>
  revoke(id: string, at: Date): Promise<void>
  recordView(id: string, at: Date): Promise<void>
}
