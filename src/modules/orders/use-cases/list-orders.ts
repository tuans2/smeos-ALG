/**
 * Use-case: List Orders (Xem danh sách đơn hàng — M10, R1).
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { branchScopeOf } from "@/core/tenancy"
import type { OrderFilter } from "../domain/order-types"
import type { IOrderRepository, OrderListPage } from "../domain/repositories/order-repository.interface"
import { getOrderRepository } from "../infra/order-repository"

export async function listOrders(
  ctx: TenantContext,
  filter: OrderFilter = {},
  repo: IOrderRepository = getOrderRepository()
): Promise<OrderListPage> {
  // Nhân viên chi nhánh chỉ thấy đơn của chi nhánh mình (checklist ALG 9.13)
  const scope = branchScopeOf(ctx)
  return repo.list(ctx.organizationId, scope ? { ...filter, branchId: scope } : filter)
}
