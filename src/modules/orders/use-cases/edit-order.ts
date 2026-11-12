/**
 * `PATCH /orders/:id` (R3): sửa đơn từ sổ đơn. Đơn đã sang Điều phối không đổi trục vòng đời ở đây (audit User Journey
 * UJ-09, O4) — tiến độ đi qua `/coordinator/orders/:id/stage` để bước điều phối và ba trục cùng đổi. Mỗi lần sửa ghi
 * `audit_logs` (ADR-013 D-I4): trục trước/sau và TÊN trường đã sửa — không chép địa chỉ, SĐT, lời thiệp vào nhật ký.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { orderCoordinationPort } from "@/modules/coordinator/use-cases/order-coordination-port"
import type { OrderRecord, UpdateOrderInput } from "../domain/order-types"
import { getOrderRepository } from "../infra/order-repository"
import { updateOrderProgress, type CoordinationCheck } from "./update-order-progress"

export async function editOrder(
  ctx: TenantContext,
  orderId: string,
  input: UpdateOrderInput,
  coordination: CoordinationCheck = orderCoordinationPort,
  audit: typeof recordAuditLog = recordAuditLog
): Promise<OrderRecord> {
  const before = await getOrderRepository().findById(ctx.organizationId, orderId)
  const updated = await updateOrderProgress(ctx, orderId, input, getOrderRepository(), notifyOrganization, coordination)
  const fields = (Object.keys(input) as (keyof UpdateOrderInput)[]).filter((k) => input[k] !== undefined)
  await audit(ctx, {
    action: "order.update",
    entityType: "orders",
    entityId: orderId,
    before: before ? { status: before.status, productionStatus: before.productionStatus, deliveryStatus: before.deliveryStatus } : null,
    after: { status: updated.status, productionStatus: updated.productionStatus, deliveryStatus: updated.deliveryStatus, fields },
  })
  return updated
}
