import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma, usage_destination, usage_status } from "@/generated/prisma/client"
import type { UsageDestination } from "../domain/asset-type"
import type { AssetUsage, AssetUsageStatus } from "../domain/asset-usage"
import type { CtaCode } from "../domain/cta-registry"
import type {
  AssetUsageFilter,
  CreateAssetUsageData,
  IAssetUsageRepository,
  UpdateAssetUsageData,
} from "../domain/repositories/asset-usage-repository.interface"

function toDomain(row: {
  id: string
  organization_id: string
  source_type: string
  source_id: string
  asset_type_code: string
  destination: usage_destination
  cta_code: string
  title: string
  short_link_id: string | null
  campaign_id: string | null
  config: unknown
  status: usage_status
  created_by: string
  created_at: Date
  updated_at: Date
}): AssetUsage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    assetTypeCode: row.asset_type_code,
    destination: row.destination as UsageDestination,
    ctaCode: row.cta_code as CtaCode,
    title: row.title,
    shortLinkId: row.short_link_id,
    campaignId: row.campaign_id,
    config: (row.config as Record<string, unknown>) ?? {},
    status: row.status as AssetUsageStatus,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class AssetUsageRepository implements IAssetUsageRepository {
  async create(ctx: TenantContext, data: CreateAssetUsageData): Promise<AssetUsage> {
    const created = await prisma.asset_usages.create({
      data: {
        organization_id: ctx.organizationId,
        source_type: data.sourceType,
        source_id: data.sourceId,
        asset_type_code: data.assetTypeCode,
        destination: data.destination as usage_destination,
        cta_code: data.ctaCode,
        title: data.title,
        short_link_id: data.shortLinkId ?? null,
        campaign_id: data.campaignId ?? null,
        config: (data.config ?? {}) as Prisma.InputJsonValue,
        status: (data.status ?? "ACTIVE") as usage_status,
        created_by: data.createdBy,
      },
    })
    return toDomain(created)
  }

  async findById(ctx: TenantContext, id: string): Promise<AssetUsage | null> {
    const found = await prisma.asset_usages.findFirst({
      where: scopedWhere(ctx, { id }),
    })
    return found ? toDomain(found) : null
  }

  async listBySource(ctx: TenantContext, sourceType: string, sourceId: string): Promise<readonly AssetUsage[]> {
    const rows = await prisma.asset_usages.findMany({
      where: scopedWhere(ctx, { source_type: sourceType, source_id: sourceId }),
      orderBy: { created_at: "desc" },
    })
    return rows.map(toDomain)
  }

  async list(ctx: TenantContext, filter?: AssetUsageFilter): Promise<readonly AssetUsage[]> {
    const where: Prisma.asset_usagesWhereInput = {}
    if (filter?.destination) {
      where.destination = filter.destination as usage_destination
    }
    if (filter?.campaignId) {
      where.campaign_id = filter.campaignId
    }
    if (filter?.status) {
      where.status = filter.status as usage_status
    }

    const rows = await prisma.asset_usages.findMany({
      where: scopedWhere(ctx, where),
      orderBy: { created_at: "desc" },
      take: filter?.take ?? 50,
      skip: filter?.skip ?? 0,
    })
    return rows.map(toDomain)
  }

  async update(ctx: TenantContext, id: string, data: UpdateAssetUsageData): Promise<AssetUsage> {
    const updateData: Prisma.asset_usagesUpdateInput = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.ctaCode !== undefined) updateData.cta_code = data.ctaCode
    if (data.destination !== undefined) updateData.destination = data.destination as usage_destination
    if (data.shortLinkId !== undefined) {
      updateData.short_link = data.shortLinkId
        ? { connect: { id: data.shortLinkId } }
        : { disconnect: true }
    }
    if (data.campaignId !== undefined) {
      updateData.campaign = data.campaignId
        ? { connect: { id: data.campaignId } }
        : { disconnect: true }
    }
    if (data.config !== undefined) updateData.config = data.config as Prisma.InputJsonValue
    if (data.status !== undefined) updateData.status = data.status as usage_status

    const updated = await prisma.asset_usages.update({
      where: { id },
      data: updateData,
    })
    return toDomain(updated)
  }
}

let singletonRepo: IAssetUsageRepository | null = null

export function getAssetUsageRepository(): IAssetUsageRepository {
  if (!singletonRepo) {
    singletonRepo = new AssetUsageRepository()
  }
  return singletonRepo
}

