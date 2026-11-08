/**
 * Use-case: Get Customer Master Index.
 */

import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerMasterIndex } from "../domain/customer-master-index"
import type { ICustomerRepository } from "../domain/repositories/customer-repository.interface"
import { getCustomerRepository } from "../infra/customer-repository"

export async function getCustomerMasterIndex(
  ctx: TenantContext,
  id: string,
  repo: ICustomerRepository = getCustomerRepository()
): Promise<CustomerMasterIndex> {
  const customer = await repo.getById(ctx, id)
  if (!customer) {
    throw notFound()
  }

  // Đọc không ghi (audit BL-14): chỉ số khách do bộ quét nền tính lại khi đơn đổi (`customer-metrics-sweep.ts`)
  return customer
}
