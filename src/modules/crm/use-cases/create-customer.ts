/**
 * Use-case: Create Customer (Tạo hồ sơ khách hàng mới).
 */

import { conflict, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { isValidVietnamesePhone, normalizeVietnamesePhone } from "../domain/crm-rules"
import type { CustomerMasterIndex } from "../domain/customer-master-index"
import type {
  ICustomerRepository,
  CreateCustomerInput,
} from "../domain/repositories/customer-repository.interface"
import { getCustomerRepository } from "../infra/customer-repository"

export async function createCustomer(
  ctx: TenantContext,
  input: CreateCustomerInput,
  repo: ICustomerRepository = getCustomerRepository()
): Promise<CustomerMasterIndex> {
  if (!input.name.trim()) {
    throw validationFailed({ name: "Tên khách hàng không được để trống" })
  }

  if (!isValidVietnamesePhone(input.phone)) {
    throw validationFailed({ phone: "Số điện thoại Việt Nam không hợp lệ" })
  }

  const phone = normalizeVietnamesePhone(input.phone)

  const existing = await repo.findByPhone(ctx, phone)
  if (existing) {
    throw conflict(`Số điện thoại ${phone} đã tồn tại trong danh sách khách hàng`)
  }

  return repo.create(ctx, { ...input, phone })
}
