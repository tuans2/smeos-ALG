import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ICustomerSegmentRepository } from "../domain/repositories/customer-segment-repository.interface"
import { getCustomerSegmentRepository } from "../infra/customer-segment-repository"

export async function deleteCustomerSegmentUseCase(
  ctx: TenantContext,
  id: string,
  repo: ICustomerSegmentRepository = getCustomerSegmentRepository()
): Promise<boolean> {
  return repo.delete(ctx, id)
}

