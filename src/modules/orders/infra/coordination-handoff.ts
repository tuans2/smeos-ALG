/**
 * Đưa đơn ngoài Thẻ chào sang Điều phối (bước tiếp nhận) trong một giao dịch — dùng chung cho
 * duyệt giao trước (P3a) và xác nhận tiền (P3b). Gọi lặp an toàn.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { Prisma } from "@/generated/prisma/client"
import { markLeadWonForOrder } from "./order-lead-link"

export async function sendToCoordination(
  tx: Prisma.TransactionClient,
  ctx: TenantContext,
  order: { id: string; source: string | null; status: string },
  reason: string,
): Promise<void> {
  await tx.order_coordinations.upsert({
    where: { order_id: order.id },
    create: { organization_id: ctx.organizationId, order_id: order.id, stage: "INTAKE", source: order.source },
    update: {},
  })
  await tx.orders.update({ where: { id: order.id }, data: { workflow: "STANDARD" } })
  // Tiền về / duyệt giao trước = khách đã chốt thật (UJ-13)
  await markLeadWonForOrder(tx, ctx.organizationId, order.id)
  await tx.order_events.create({
    data: { organization_id: ctx.organizationId, order_id: order.id, axis: "order", from_value: order.status, to_value: order.status, actor_id: ctx.userId, reason },
  })
}
