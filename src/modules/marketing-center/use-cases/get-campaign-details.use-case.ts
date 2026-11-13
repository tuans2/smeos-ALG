import type { TenantContext } from "@/core/tenancy/tenant-context"
import { notFound } from "@/core/http/errors"
import type { AssetUsage } from "../domain/asset-usage"
import type { Campaign, CampaignStats } from "../domain/campaign"
import type { IAssetUsageRepository } from "../domain/repositories/asset-usage-repository.interface"
import type { ICampaignRepository } from "../domain/repositories/campaign-repository.interface"
import { getAssetUsageRepository } from "../infra/asset-usage-repository"
import { getCampaignRepository } from "../infra/campaign-repository"

export interface CampaignDetailsResult {
  campaign: Campaign
  stats: CampaignStats
  usages: readonly AssetUsage[]
}

export async function getCampaignDetailsUseCase(
  ctx: TenantContext,
  id: string,
  campaignRepo: ICampaignRepository = getCampaignRepository(),
  usageRepo: IAssetUsageRepository = getAssetUsageRepository(),
): Promise<CampaignDetailsResult> {
  const campaign = await campaignRepo.findById(ctx, id)
  if (!campaign) {
    throw notFound()
  }

  const [stats, usages] = await Promise.all([
    campaignRepo.getStats(ctx, id),
    usageRepo.list(ctx, { campaignId: id, take: 100 }),
  ])

  return {
    campaign,
    stats,
    usages,
  }
}
