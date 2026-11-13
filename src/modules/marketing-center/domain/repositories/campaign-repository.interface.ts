import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { Campaign, CampaignObjective, CampaignStats, CampaignStatus } from "../campaign"

export interface CampaignFilter {
  status?: CampaignStatus | undefined
  objective?: CampaignObjective | undefined
  limit?: number | undefined
  cursor?: string | undefined
}

export interface ICampaignRepository {
  create(data: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Promise<Campaign>
  findById(ctx: TenantContext, id: string): Promise<Campaign | null>
  list(ctx: TenantContext, filter?: CampaignFilter | undefined): Promise<{ items: Campaign[]; nextCursor: string | null }>
  update(
    ctx: TenantContext,
    id: string,
    patch: Partial<Pick<Campaign, "name" | "objective" | "occasionCode" | "startsAt" | "endsAt" | "status">>,
  ): Promise<Campaign | null>
  getStats(ctx: TenantContext, campaignId: string): Promise<CampaignStats>
  countByStatus(ctx: TenantContext): Promise<Record<string, number>>
}

