/**
 * Use-case: Add Customer Occasion (Thêm ngày kỷ niệm).
 */

import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type {
  ICustomerRepository,
  AddOccasionInput,
} from "../domain/repositories/customer-repository.interface"
import { getCustomerRepository } from "../infra/customer-repository"

export async function addCustomerOccasion(
  ctx: TenantContext,
  customerId: string,
  data: AddOccasionInput,
  repo: ICustomerRepository = getCustomerRepository()
) {
  if (!data.name.trim()) {
    throw validationFailed({ name: "Tên dịp kỷ niệm không được để trống" })
  }
  if (!data.date.trim()) {
    throw validationFailed({ date: "Ngày kỷ niệm không được để trống" })
  }

  const customer = await repo.getById(ctx, customerId)
  if (!customer) {
    throw notFound()
  }

  return repo.addOccasion(ctx, customerId, data)
}
