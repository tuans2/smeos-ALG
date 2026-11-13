import type { TenantContext } from "@/core/tenancy/tenant-context"
import { validationFailed } from "@/core/http/errors"
import {
  type Campaign,
  type CreateCampaignInput,
  validateCampaignInput,
} from "../domain/campaign"
import type { ICampaignRepository } from "../domain/repositories/campaign-repository.interface"
import { getCampaignRepository } from "../infra/campaign-repository"

export async function createCampaignUseCase(
  ctx: TenantContext,
  input: CreateCampaignInput,
  repo: ICampaignRepository = getCampaignRepository(),
): Promise<Campaign> {
  const errors = validateCampaignInput(input)
  if (Object.keys(errors).length > 0) {
    throw validationFailed(errors)
  }

  return repo.create({
    organizationId: ctx.organizationId,
    name: input.name.trim(),
    objective: input.objective,
    occasionCode: input.occasionCode?.trim() || null,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    status: input.status ?? "DRAFT",
    createdBy: ctx.userId ?? "system",
  })
}
