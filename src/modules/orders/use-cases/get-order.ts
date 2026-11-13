/**
 * Use-case: Get Order Detail (Xem chi tiết đơn hàng & SLA — M10, R1).
 */

import { AppError } from "@/core/http/errors"
import { inBranchScope } from "@/core/tenancy"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { calculateOrderSla } from "../domain/order-rules"
import type { OrderRecord, OrderSlaCalculation } from "../domain/order-types"
import type { IOrderRepository } from "../domain/repositories/order-repository.interface"
import { getOrderRepository } from "../infra/order-repository"

export async function getOrder(
  ctx: TenantContext,
  orderId: string,
  repo: IOrderRepository = getOrderRepository()
): Promise<{ order: OrderRecord; sla: OrderSlaCalculation }> {
  const order = await repo.findById(ctx.organizationId, orderId)
  // Ngoài chi nhánh được giao → như không tồn tại (checklist ALG 9.13)
  if (!order || !inBranchScope(ctx, order.branchId)) {
    throw new AppError("NOT_FOUND", `Không tìm thấy đơn hàng với mã ID: ${orderId}`)
  }

  const sla = calculateOrderSla(order.events ?? [])

  return { order, sla }
}
