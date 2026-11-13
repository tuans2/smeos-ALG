/** `GET /api/v1/orders/coordination-queue` (R1) — đơn ngoài Thẻ chào đang điều phối, việc gấp trước (P4). */

import type { TenantContext } from "@/core/tenancy"
import { stageLabel } from "@/modules/coordinator/domain/operation-rules"
import { orderSourceLabel } from "../domain/order-source"
import { CoordinationQueueRepository } from "../infra/coordination-queue-repository"

export async function listCoordinationQueue(ctx: TenantContext, repo: Pick<CoordinationQueueRepository, "list"> = new CoordinationQueueRepository()) {
  const rows = await repo.list(ctx)
  return {
    items: rows.map((r) => {
      const window = (r.order.delivery_window ?? {}) as { date?: string; timeSlot?: string }
      const address = (r.order.delivery_address ?? {}) as { recipientName?: string }
      return {
        orderId: r.order.id,
        code: r.order.code,
        sourceLabel: orderSourceLabel(r.order.source),
        stageLabel: stageLabel(r.stage),
        atRisk: r.risk_level !== "NORMAL",
        nextAction: r.next_action,
        nextActionDue: r.next_action_due?.toISOString() ?? null,
        deliveryDate: window.date ?? null,
        deliveryTimeSlot: window.timeSlot ?? null,
        recipientName: address.recipientName ?? null,
        balanceVnd: Number(r.order.balance_vnd),
      }
    }),
  }
}
