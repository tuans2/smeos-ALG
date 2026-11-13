import type { TenantContext } from "@/core/tenancy/tenant-context"
import { notFound, validationFailed } from "@/core/http/errors"
import {
  CAMPAIGN_STATUS_LABELS,
  canTransitionCampaignStatus,
  type Campaign,
  type CampaignObjective,
  type CampaignStatus,
} from "../domain/campaign"
import type { ICampaignRepository } from "../domain/repositories/campaign-repository.interface"
import { getCampaignRepository } from "../infra/campaign-repository"

export interface UpdateCampaignInput {
  name?: string | undefined
  objective?: CampaignObjective | undefined
  occasionCode?: string | null | undefined
  startsAt?: Date | string | null | undefined
  endsAt?: Date | string | null | undefined
  status?: CampaignStatus | undefined
}

export async function updateCampaignUseCase(
  ctx: TenantContext,
  id: string,
  input: UpdateCampaignInput,
  repo: ICampaignRepository = getCampaignRepository(),
): Promise<Campaign> {
  const existing = await repo.findById(ctx, id)
  if (!existing) {
    throw notFound()
  }

  if (input.status && !canTransitionCampaignStatus(existing.status, input.status)) {
    throw validationFailed({
      status: `Không thể chuyển trạng thái chiến dịch từ "${CAMPAIGN_STATUS_LABELS[existing.status]}" sang "${CAMPAIGN_STATUS_LABELS[input.status]}"`,
    })
  }

  const patch: Partial<Pick<Campaign, "name" | "objective" | "occasionCode" | "startsAt" | "endsAt" | "status">> = {}
  if (input.name !== undefined) {
    const trimmed = input.name.trim()
    if (!trimmed) throw validationFailed({ name: "Tên chiến dịch không được để trống" })
    patch.name = trimmed
  }
  if (input.objective !== undefined) patch.objective = input.objective
  if (input.occasionCode !== undefined) patch.occasionCode = input.occasionCode?.trim() || null
  if (input.startsAt !== undefined) patch.startsAt = input.startsAt ? new Date(input.startsAt) : null
  if (input.endsAt !== undefined) patch.endsAt = input.endsAt ? new Date(input.endsAt) : null
  if (input.status !== undefined) patch.status = input.status

  const updated = await repo.update(ctx, id, patch)
  if (!updated) {
    throw notFound()
  }
  return updated
}
