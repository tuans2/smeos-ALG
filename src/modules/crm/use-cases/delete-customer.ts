/**
 * Use-case: Delete Customer (Xoá khách hàng - Gác bằng Hard Cap Q4 điều hành).
 */

import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ICustomerRepository } from "../domain/repositories/customer-repository.interface"
import { getCustomerRepository } from "../infra/customer-repository"

export async function deleteCustomer(
  ctx: TenantContext,
  id: string,
  repo: ICustomerRepository = getCustomerRepository()
): Promise<void> {
  const success = await repo.delete(ctx, id)
  if (!success) {
    throw notFound()
  }
}
