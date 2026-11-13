import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { findPrimaryChainLink } from "@/modules/organization/infra/tier-chain-repository"
import type { DbClient } from "./db-client"
import type { BrandLibraryCategory, BrandLibraryStatus } from "../domain/brand-library"
import type {
  BrandLibraryItemRow,
  IBrandLibraryRepository,
  NewVersionContent,
} from "../domain/repositories/brand-library-repository.interface"

const ITEM_SELECT = {
  id: true, organization_id: true, title: true, category: true, description: true,
  share_with_members: true, status: true, current_version: true, updated_at: true,
} as const

type ItemRecord = {
  id: string; organization_id: string; title: string; category: string; description: string | null
  share_with_members: boolean; status: string; current_version: number; updated_at: Date
  versions: { version: number; text_value: string | null; note: string | null; created_at: Date; asset_id: string | null }[]
}

export class BrandLibraryRepository implements IBrandLibraryRepository {
  constructor(private readonly db: DbClient = prisma) {}

  /** Gắn khoá kho cho ảnh — chỉ ảnh của chính tổ chức sở hữu mục, chưa vào thùng rác. */
  private async hydrate(rows: ItemRecord[]): Promise<BrandLibraryItemRow[]> {
    const pairs = rows.flatMap((r) => r.versions.filter((v) => v.asset_id).map((v) => ({ org: r.organization_id, id: v.asset_id! })))
    const assets = pairs.length
      ? await this.db.assets.findMany({
          where: { OR: pairs.map((p) => ({ id: p.id, organization_id: p.org })), trashed_at: null },
          select: { id: true, storage_key: true },
        })
      : []
    const keyOf = new Map(assets.map((a) => [a.id, a.storage_key]))
    return rows.map((r) => ({
      id: r.id, title: r.title, category: r.category as BrandLibraryCategory, description: r.description,
      share_with_members: r.share_with_members, status: r.status as BrandLibraryStatus,
      current_version: r.current_version, updated_at: r.updated_at,
      versions: r.versions.map((v) => ({
        version: v.version, text_value: v.text_value, note: v.note, created_at: v.created_at,
        storage_key: v.asset_id ? keyOf.get(v.asset_id) ?? null : null,
      })),
    }))
  }

  private versionSelect(take?: number) {
    return {
      orderBy: { version: "desc" as const },
      ...(take ? { take } : {}),
      select: { version: true, text_value: true, note: true, created_at: true, asset_id: true },
    }
  }

  async list(ctx: TenantContext, includeArchived: boolean): Promise<BrandLibraryItemRow[]> {
    const rows = await this.db.brand_library_items.findMany({
      where: { organization_id: ctx.organizationId, ...(includeArchived ? {} : { status: "ACTIVE" }) },
      orderBy: [{ category: "asc" }, { updated_at: "desc" }],
      take: 500,
      select: { ...ITEM_SELECT, versions: this.versionSelect(1) },
    })
    return this.hydrate(rows)
  }

  async findById(ctx: TenantContext, id: string): Promise<BrandLibraryItemRow | null> {
    const row = await this.db.brand_library_items.findFirst({
      where: { id, organization_id: ctx.organizationId },
      select: { ...ITEM_SELECT, versions: this.versionSelect(50) },
    })
    return row ? (await this.hydrate([row]))[0] ?? null : null
  }

  async create(ctx: TenantContext, meta: { title: string; category: BrandLibraryCategory; description: string | null }, content: NewVersionContent): Promise<string> {
    const item = await this.db.brand_library_items.create({
      data: {
        organization_id: ctx.organizationId, title: meta.title, category: meta.category,
        description: meta.description, created_by: ctx.userId,
        versions: {
          create: {
            version: 1, asset_id: content.assetId,
            text_value: content.textValue, note: content.note, created_by: ctx.userId,
          },
        },
      },
      select: { id: true },
    })
    return item.id
  }

  async addVersion(ctx: TenantContext, id: string, content: NewVersionContent): Promise<number | null> {
    const run = async (tx: DbClient) => {
      // Tăng số phiên bản có điều kiện tổ chức — hai lần lưu cùng lúc không trùng số (unique item_id+version)
      const res = await tx.brand_library_items.updateMany({
        where: { id, organization_id: ctx.organizationId },
        data: { current_version: { increment: 1 } },
      })
      if (res.count === 0) return null
      const { current_version } = await tx.brand_library_items.findFirstOrThrow({ where: { id, organization_id: ctx.organizationId }, select: { current_version: true } })
      await tx.brand_library_versions.create({
        data: {
          organization_id: ctx.organizationId, item_id: id, version: current_version,
          asset_id: content.assetId, text_value: content.textValue, note: content.note, created_by: ctx.userId,
        },
      })
      return current_version
    }
    return "$transaction" in this.db ? this.db.$transaction((tx) => run(tx)) : run(this.db)
  }

  async update(ctx: TenantContext, id: string, patch: { title?: string; description?: string | null; share_with_members?: boolean; status?: BrandLibraryStatus }): Promise<boolean> {
    const res = await this.db.brand_library_items.updateMany({ where: { id, organization_id: ctx.organizationId }, data: patch })
    return res.count > 0
  }

  async assetMime(ctx: TenantContext, assetId: string): Promise<string | null> {
    const a = await this.db.assets.findFirst({
      where: { id: assetId, organization_id: ctx.organizationId, trashed_at: null },
      select: { mime_type: true },
    })
    return a?.mime_type ?? null
  }

  async chainOf(organizationId: string): Promise<{ chainOrgId: string; chainName: string } | null> {
    const link = await findPrimaryChainLink(organizationId, this.db)
    return link ? { chainOrgId: link.chainOrgId, chainName: link.chainName } : null
  }

  async listSharedBy(chainOrgId: string): Promise<BrandLibraryItemRow[]> {
    const rows = await this.db.brand_library_items.findMany({
      where: { organization_id: chainOrgId, share_with_members: true, status: "ACTIVE" },
      orderBy: [{ category: "asc" }, { updated_at: "desc" }],
      take: 500,
      select: { ...ITEM_SELECT, versions: this.versionSelect(1) },
    })
    return this.hydrate(rows)
  }
}

let defaultRepo: IBrandLibraryRepository | null = null

export function getBrandLibraryRepository(db?: DbClient): IBrandLibraryRepository {
  if (db) return new BrandLibraryRepository(db)
  defaultRepo ??= new BrandLibraryRepository()
  return defaultRepo
}
