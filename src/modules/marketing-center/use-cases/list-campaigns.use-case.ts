import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { Campaign } from "../domain/campaign"
import type {
  CampaignFilter,
  ICampaignRepository,
} from "../domain/repositories/campaign-repository.interface"
import { getCampaignRepository } from "../infra/campaign-repository"

export interface ListCampaignsResult {
  items: Campaign[]
  counts: Record<string, number>
  nextCursor: string | null
}

export async function listCampaignsUseCase(
  ctx: TenantContext,
  filter?: CampaignFilter | undefined,
  repo: ICampaignRepository = getCampaignRepository(),
): Promise<ListCampaignsResult> {
  const [listRes, counts] = await Promise.all([
    repo.list(ctx, filter),
    repo.countByStatus(ctx),
  ])

  return {
    items: listRes.items,
    counts,
    nextCursor: listRes.nextCursor,
  }
}
