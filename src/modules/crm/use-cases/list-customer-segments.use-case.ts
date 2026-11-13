import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerSegment } from "../domain/customer-segment"
import type {
  ICustomerSegmentRepository,
  CustomerSegmentFilter,
} from "../domain/repositories/customer-segment-repository.interface"
import { getCustomerSegmentRepository } from "../infra/customer-segment-repository"

export async function listCustomerSegmentsUseCase(
  ctx: TenantContext,
  filter?: CustomerSegmentFilter,
  repo: ICustomerSegmentRepository = getCustomerSegmentRepository()
): Promise<{ items: CustomerSegment[]; total: number }> {
  return repo.list(ctx, filter)
}

