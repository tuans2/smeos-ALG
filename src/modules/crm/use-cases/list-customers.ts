/**
 * Use-case: List Customers.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerMasterIndex, CustomerTier } from "../domain/customer-master-index"
import type { ICustomerRepository } from "../domain/repositories/customer-repository.interface"
import { getCustomerRepository } from "../infra/customer-repository"

export async function listCustomers(
  ctx: TenantContext,
  filters?: { tier?: CustomerTier | undefined; search?: string | undefined },
  pagination?: { limit?: number | undefined; offset?: number | undefined },
  repo: ICustomerRepository = getCustomerRepository()
): Promise<{ items: CustomerMasterIndex[]; total: number }> {
  return repo.list(ctx, filters, pagination)
}
