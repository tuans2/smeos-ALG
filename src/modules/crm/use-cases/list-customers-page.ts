/**
 * Use-case: danh sách khách theo con trỏ (đặc tả 06 §2) — dùng cho `GET /api/v1/customers` (màn Chăm sóc khách).
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerMasterIndex } from "../domain/customer-master-index"
import type {
  CustomerListFilters,
  CustomerPageAfter,
  ICustomerPageReader,
} from "../domain/repositories/customer-repository.interface"
import { getCustomerPageReader } from "../infra/customer-repository"

export async function listCustomersPage(
  ctx: TenantContext,
  filters: CustomerListFilters,
  page: { take: number; after?: CustomerPageAfter | undefined },
  reader: ICustomerPageReader = getCustomerPageReader()
): Promise<CustomerMasterIndex[]> {
  return reader.listPage(ctx, filters, page)
}
