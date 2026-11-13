import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerSegment } from "../domain/customer-segment"
import type { ICustomerSegmentRepository } from "../domain/repositories/customer-segment-repository.interface"
import { getCustomerSegmentRepository } from "../infra/customer-segment-repository"

export async function getCustomerSegmentUseCase(
  ctx: TenantContext,
  id: string,
  repo: ICustomerSegmentRepository = getCustomerSegmentRepository()
): Promise<CustomerSegment | null> {
  return repo.findById(ctx, id)
}

