import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import type { DbClient } from "./db-client"
import type {
  IStoreShareLinkRepository,
  PublicStoreRaw,
  StoreShareLinkRecord,
} from "../domain/repositories/store-share-link-repository.interface"

const RECORD_SELECT = { id: true, slug: true, is_revoked: true, view_count: true, created_at: true } as const

const isUrl = (v: string) => v.startsWith("/") || /^https?:\/\//i.test(v)

export class StoreShareLinkRepository implements IStoreShareLinkRepository {
  constructor(private readonly db: DbClient = prisma) {}

  findActive(ctx: TenantContext): Promise<StoreShareLinkRecord | null> {
    return this.db.store_share_links.findFirst({
      where: { organization_id: ctx.organizationId, is_revoked: false },
      orderBy: { created_at: "desc" },
      select: RECORD_SELECT,
    })
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await this.db.store_share_links.count({ where: { slug } })) > 0
  }

  async createIfNoActive(ctx: TenantContext, slug: string): Promise<StoreShareLinkRecord> {
    const run = async (tx: DbClient) => {
      const active = await tx.store_share_links.findFirst({
        where: { organization_id: ctx.organizationId, is_revoked: false },
        select: RECORD_SELECT,
      })
      if (active) return active
      return tx.store_share_links.create({
        data: { organization_id: ctx.organizationId, slug, created_by: ctx.userId },
        select: RECORD_SELECT,
      })
    }
    return "$transaction" in this.db
      ? this.db.$transaction((tx) => run(tx), { isolationLevel: "Serializable" })
      : run(this.db)
  }

  async revokeActive(ctx: TenantContext): Promise<boolean> {
    const res = await this.db.store_share_links.updateMany({
      where: { organization_id: ctx.organizationId, is_revoked: false },
      data: { is_revoked: true, revoked_at: new Date(), revoked_by: ctx.userId },
    })
    return res.count > 0
  }

  async findPublic(slug: string): Promise<PublicStoreRaw | null> {
    const link = await this.db.store_share_links.findUnique({
      where: { slug },
      select: { organization_id: true, is_revoked: true },
    })
    if (!link) return null
    const orgId = link.organization_id
    const [org, biz, brand] = await Promise.all([
      this.db.organizations.findUnique({ where: { id: orgId }, select: { name: true } }),
      this.db.business_profiles.findUnique({
        where: { organization_id: orgId },
        select: {
          display_name: true, phone: true, email: true, address: true, website: true,
          description: true, social_links: true, operating_hours: true,
        },
      }),
      this.db.brand_profiles.findUnique({
        where: { organization_id: orgId },
        select: { primary_color: true, logo_asset_id: true },
      }),
    ])

    let logo: PublicStoreRaw["logo"] = null
    const logoRef = brand?.logo_asset_id
    if (logoRef && isUrl(logoRef)) {
      logo = { kind: "URL", url: logoRef }
    } else if (logoRef) {
      // Chỉ nhận tài sản của chính tổ chức sở hữu link, chưa vào thùng rác.
      const asset = await this.db.assets.findFirst({
        where: { id: logoRef, organization_id: orgId, trashed_at: null },
        select: { storage_key: true },
      })
      if (asset) logo = { kind: "ASSET", storageKey: asset.storage_key }
    }

    return {
      revoked: link.is_revoked,
      organizationId: orgId,
      orgName: org?.name ?? "",
      business: biz,
      primaryColor: brand?.primary_color ?? null,
      logo,
    }
  }

  async incrementViews(slug: string): Promise<void> {
    await this.db.store_share_links.updateMany({
      where: { slug, is_revoked: false },
      data: { view_count: { increment: 1 } },
    })
  }
}

let defaultRepo: IStoreShareLinkRepository | null = null

export function getStoreShareLinkRepository(db?: DbClient): IStoreShareLinkRepository {
  if (db) return new StoreShareLinkRepository(db)
  defaultRepo ??= new StoreShareLinkRepository()
  return defaultRepo
}
