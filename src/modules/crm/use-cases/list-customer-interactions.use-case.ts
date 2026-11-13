import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerInteraction } from "../domain/customer-segment"
import type {
  ICustomerInteractionRepository,
  CustomerInteractionFilter,
} from "../domain/repositories/customer-interaction-repository.interface"
import { getCustomerInteractionRepository } from "../infra/customer-interaction-repository"

export async function listCustomerInteractionsUseCase(
  ctx: TenantContext,
  filter?: CustomerInteractionFilter,
  repo: ICustomerInteractionRepository = getCustomerInteractionRepository()
): Promise<{ items: CustomerInteraction[]; total: number }> {
  return repo.list(ctx, filter)
}

