/**
 * Use-case: Update Customer Consent (Cập nhật quyền riêng tư và tiếp thị).
 */

import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ICustomerRepository } from "../domain/repositories/customer-repository.interface"
import { getCustomerRepository } from "../infra/customer-repository"

export async function updateCustomerConsent(
  ctx: TenantContext,
  customerId: string,
  channel: "ZALO_ZNS" | "SMS" | "PHONE_CALL" | "PROMOTION",
  granted: boolean,
  repo: ICustomerRepository = getCustomerRepository()
) {
  const customer = await repo.getById(ctx, customerId)
  if (!customer) {
    throw notFound()
  }

  return repo.updateConsent(ctx, customerId, channel, granted)
}
