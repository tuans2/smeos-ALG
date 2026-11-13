import type { DbClient } from "./db-client"
import { readBrandMaterials } from "@/modules/brand-kit/domain/brand-assets"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { InputJsonValue } from "./entities"
import type {
  ICatalogLinkRepository,
  CreateCatalogLinkInput,
  UpdateCatalogLinkInput,
  PublicCatalogRawData,
} from "../domain/repositories/catalog-link-repository.interface"

export class CatalogLinkRepository implements ICatalogLinkRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async findBySlug(slug: string) {
    return this.db.catalog_links.findUnique({ where: { slug } })
  }

  async findBySlugInOrg(ctx: TenantContext, slug: string) {
    return this.db.catalog_links.findFirst({ where: scopedWhere(ctx, { slug }) })
  }

  async create(ctx: TenantContext, input: {
    slug: string
    name: string
    description?: string | null
    filters?: Record<string, unknown> | null
    createdBy: string
  }) {
    return this.db.catalog_links.create({
      data: {
        organization_id: ctx.organizationId,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        filters: (input.filters ?? null) as InputJsonValue,
        created_by: input.createdBy,
      },
    })
  }

  async list(ctx: TenantContext, options: { includeRevoked?: boolean } = {}) {
    return this.db.catalog_links.findMany({
      where: scopedWhere(ctx, {
        ...(options.includeRevoked ? {} : { is_revoked: false }),
      }),
      orderBy: { created_at: "desc" },
    })
  }

  async update(ctx: TenantContext, slug: string, input: {
    name?: string
    description?: string | null
    filters?: Record<string, unknown> | null
  }) {
    const result = await this.db.catalog_links.updateMany({
      where: scopedWhere(ctx, { slug }),
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.filters !== undefined ? { filters: input.filters as InputJsonValue } : {}),
      },
    })
    if (result.count === 0) return null
    return this.findBySlugInOrg(ctx, slug)
  }

  async revoke(ctx: TenantContext, slug: string, revokedBy: string) {
    const result = await this.db.catalog_links.updateMany({
      where: scopedWhere(ctx, { slug, is_revoked: false }),
      data: {
        is_revoked: true,
        revoked_at: new Date(),
        revoked_by: revokedBy,
      },
    })
    return result.count > 0
  }

  async getPublicCatalogRaw(slug: string): Promise<PublicCatalogRawData | null> {
    const link = await this.db.catalog_links.findUnique({
      where: { slug },
    })

    if (!link) return null
    if (link.is_revoked || link.revoked_at) {
      return { link, revoked: true as const }
    }

    const [org, bizProfile, brandProfile] = await Promise.all([
      this.db.organizations.findUnique({
        where: { id: link.organization_id },
        select: { name: true, settings: true },
      }),
      this.db.business_profiles.findUnique({
        where: { organization_id: link.organization_id },
      }),
      this.db.brand_profiles.findUnique({
        where: { organization_id: link.organization_id },
      }),
    ])

    const filters = (link.filters as Record<string, unknown>) || {}
    // Landing page chính thức (mục Thương hiệu): sản phẩm chủ đạo đọc sống từ Hồ sơ, không chốt lúc xuất bản
    const featured = filters.store_official === true ? readBrandMaterials(brandProfile?.brand_assets).featuredProductIds : []
    const productIds = featured.length > 0 ? [...featured] : Array.isArray(filters.product_ids) ? (filters.product_ids as string[]) : []

    const productRows = await this.db.products.findMany({
      where: {
        organization_id: link.organization_id,
        status: "ACTIVE",
        ...(productIds.length > 0 ? { id: { in: productIds } } : {}),
      },
      orderBy: { created_at: "desc" },
      take: 100,
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
        },
        analyses: {
          where: { approval_state: "APPROVED" },
          orderBy: { approved_at: "desc" },
          take: 1,
          select: { asset_id: true, raw: true, edited: true },
        },
      },
    })

    const assetIdSet = new Set<string>()
    if (brandProfile?.logo_asset_id) {
      assetIdSet.add(brandProfile.logo_asset_id)
    }

    for (const p of productRows) {
      if (p.images[0]?.asset_id) {
        assetIdSet.add(p.images[0].asset_id)
      } else if (p.analyses[0]?.asset_id) {
        assetIdSet.add(p.analyses[0].asset_id)
      }
    }

    const assetRecords = assetIdSet.size > 0
      ? await this.db.assets.findMany({
          where: { id: { in: Array.from(assetIdSet) } },
          select: { id: true, storage_key: true },
        })
      : []

    return {
      link,
      revoked: false as const,
      org,
      bizProfile,
      brandProfile,
      productRows,
      assetRecords,
    } as unknown as PublicCatalogRawData
  }
}

let defaultCatalogLinkRepository: ICatalogLinkRepository | null = null

export function getCatalogLinkRepository(): ICatalogLinkRepository {
  if (!defaultCatalogLinkRepository) {
    defaultCatalogLinkRepository = new CatalogLinkRepository()
  }
  return defaultCatalogLinkRepository!
}