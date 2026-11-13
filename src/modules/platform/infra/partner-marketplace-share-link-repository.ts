import { prisma } from "@/core/tenancy/infra/prisma"
import type { ShareLinkRecord } from "../domain/partner-marketplace-share-link"
import type { IPartnerMarketplaceShareLinkRepository } from "../domain/repositories/partner-marketplace-share-link-repository.interface"

/** Bảng cấp nền tảng (không có organization_id) — tạo/huỷ qua N17, đọc công khai theo token băm. */
type Row = {
  id: string
  label: string
  expires_at: Date
  revoked_at: Date | null
  created_by: string
  view_count: number
  last_viewed_at: Date | null
  created_at: Date
}

const select = {
  id: true,
  label: true,
  expires_at: true,
  revoked_at: true,
  created_by: true,
  view_count: true,
  last_viewed_at: true,
  created_at: true,
} as const

function toRecord(r: Row): ShareLinkRecord {
  return {
    id: r.id,
    label: r.label,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
    createdBy: r.created_by,
    viewCount: r.view_count,
    lastViewedAt: r.last_viewed_at,
    createdAt: r.created_at,
  }
}

export class PartnerMarketplaceShareLinkRepository implements IPartnerMarketplaceShareLinkRepository {
  async create(input: { tokenHash: string; label: string; expiresAt: Date; createdBy: string }) {
    const row = await prisma.partner_marketplace_share_links.create({
      data: { token_hash: input.tokenHash, label: input.label, expires_at: input.expiresAt, created_by: input.createdBy },
      select,
    })
    return toRecord(row)
  }

  async list(limit: number) {
    const rows = await prisma.partner_marketplace_share_links.findMany({ select, orderBy: { created_at: "desc" }, take: limit })
    return rows.map(toRecord)
  }

  async findById(id: string) {
    const row = await prisma.partner_marketplace_share_links.findUnique({ where: { id }, select })
    return row ? toRecord(row) : null
  }

  async findByTokenHash(tokenHash: string) {
    const row = await prisma.partner_marketplace_share_links.findUnique({ where: { token_hash: tokenHash }, select })
    return row ? toRecord(row) : null
  }

  async revoke(id: string, at: Date) {
    await prisma.partner_marketplace_share_links.updateMany({ where: { id, revoked_at: null }, data: { revoked_at: at } })
  }

  async recordView(id: string, at: Date) {
    await prisma.partner_marketplace_share_links.update({
      where: { id },
      data: { view_count: { increment: 1 }, last_viewed_at: at },
    })
  }
}

let instance: PartnerMarketplaceShareLinkRepository | undefined
export function getPartnerMarketplaceShareLinkRepository(): PartnerMarketplaceShareLinkRepository {
  instance ??= new PartnerMarketplaceShareLinkRepository()
  return instance
}
