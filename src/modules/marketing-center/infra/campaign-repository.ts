import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { campaign_objective, campaign_status } from "@/generated/prisma/client"
import type {
  Campaign,
  CampaignObjective,
  CampaignStats,
  CampaignStatus,
} from "../domain/campaign"
import type {
  CampaignFilter,
  ICampaignRepository,
} from "../domain/repositories/campaign-repository.interface"

function toDomain(row: {
  id: string
  organization_id: string
  name: string
  objective: campaign_objective
  occasion_code: string | null
  starts_at: Date | null
  ends_at: Date | null
  status: campaign_status
  created_by: string
  created_at: Date
  updated_at: Date
}): Campaign {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    objective: row.objective as CampaignObjective,
    occasionCode: row.occasion_code,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status as CampaignStatus,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CampaignRepository implements ICampaignRepository {
  async create(data: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Promise<Campaign> {
    const created = await prisma.campaigns.create({
      data: {
        organization_id: data.organizationId,
        name: data.name,
        objective: data.objective as campaign_objective,
        occasion_code: data.occasionCode,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        status: data.status as campaign_status,
        created_by: data.createdBy,
      },
    })
    return toDomain(created)
  }

  async findById(ctx: TenantContext, id: string): Promise<Campaign | null> {
    const row = await prisma.campaigns.findFirst({
      where: scopedWhere(ctx, { id }),
    })
    return row ? toDomain(row) : null
  }

  async list(ctx: TenantContext, filter?: CampaignFilter): Promise<{ items: Campaign[]; nextCursor: string | null }> {
    const limit = filter?.limit ?? 50
    const whereClause: Record<string, unknown> = {}
    if (filter?.status) whereClause.status = filter.status as campaign_status
    if (filter?.objective) whereClause.objective = filter.objective as campaign_objective

    const rows = await prisma.campaigns.findMany({
      where: scopedWhere(ctx, whereClause),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(filter?.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    return {
      items: items.map(toDomain),
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
    }
  }

  async update(
    ctx: TenantContext,
    id: string,
    patch: Partial<Pick<Campaign, "name" | "objective" | "occasionCode" | "startsAt" | "endsAt" | "status">>,
  ): Promise<Campaign | null> {
    const updateData: Record<string, unknown> = {}
    if (patch.name !== undefined) updateData.name = patch.name
    if (patch.objective !== undefined) updateData.objective = patch.objective as campaign_objective
    if (patch.occasionCode !== undefined) updateData.occasion_code = patch.occasionCode
    if (patch.startsAt !== undefined) updateData.starts_at = patch.startsAt
    if (patch.endsAt !== undefined) updateData.ends_at = patch.endsAt
    if (patch.status !== undefined) updateData.status = patch.status as campaign_status

    const existing = await prisma.campaigns.findFirst({
      where: scopedWhere(ctx, { id }),
      select: { id: true },
    })
    if (!existing) return null

    const updated = await prisma.campaigns.update({
      where: { id },
      data: updateData,
    })
    return toDomain(updated)
  }

  async getStats(ctx: TenantContext, campaignId: string): Promise<CampaignStats> {
    const usages = await prisma.asset_usages.findMany({
      where: scopedWhere(ctx, { campaign_id: campaignId }),
      select: { id: true, short_link_id: true },
    })

    const totalUsages = usages.length
    const shortLinkIds = usages
      .map((u) => u.short_link_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)

    if (shortLinkIds.length === 0) {
      return { totalUsages, totalScans: 0, totalLeads: 0, convertedOrders: 0 }
    }

    const [scansAgg, leadsCount, convertedCount] = await Promise.all([
      prisma.short_links.aggregate({
        where: scopedWhere(ctx, { id: { in: shortLinkIds } }),
        _sum: { scan_count: true },
      }),
      prisma.leads.count({
        where: scopedWhere(ctx, { short_link_id: { in: shortLinkIds } }),
      }),
      prisma.leads.count({
        where: scopedWhere(ctx, {
          short_link_id: { in: shortLinkIds },
          converted_order_id: { not: null },
        }),
      }),
    ])

    return {
      totalUsages,
      totalScans: scansAgg._sum.scan_count ?? 0,
      totalLeads: leadsCount,
      convertedOrders: convertedCount,
    }
  }

  async countByStatus(ctx: TenantContext): Promise<Record<string, number>> {
    const groups = await prisma.campaigns.groupBy({
      by: ["status"],
      where: scopedWhere(ctx),
      _count: { _all: true },
    })
    return Object.fromEntries(groups.map((g) => [g.status, g._count._all]))
  }
}

let repositoryInstance: ICampaignRepository | null = null

export function getCampaignRepository(): ICampaignRepository {
  if (!repositoryInstance) {
    repositoryInstance = new CampaignRepository()
  }
  return repositoryInstance
}
