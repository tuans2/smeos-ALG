/**
 * Lượt xử lý sự kiện đến hạn (cron). Có giới hạn số sự kiện mỗi lượt và số lần thử mỗi sự kiện.
 * Payload gốc không được lưu (chỉ bản đã che), nên connector xử lý trên payload đã che;
 * đầu nối cần dữ liệu đầy đủ phải tự lấy lại từ nhà cung cấp theo mã sự kiện.
 */

import { log } from "@/core/observability/log"
import { outcomeAfterFailure } from "../domain/event-retry-policy"
import { defaultHubDeps, type HubDeps } from "./hub-deps"
import type { ConnectionRecord } from "../infra/connection-repository"
import { importChannelOrder } from "./sales-channel"

export const MAX_EVENTS_PER_SWEEP = 100

type ImportOrder = (connection: ConnectionRecord, externalOrderId: string) => Promise<string | null>

/** Sự kiện `order.*` của kênh bán: payload chỉ mang mã đơn — chi tiết lấy lại qua API rồi nhập đơn. */
function orderIdOf(payload: unknown): string | null {
  const id = (payload as { orderId?: unknown } | null)?.orderId
  return typeof id === "string" && id.length > 0 ? id : null
}

export async function processDueEvents(
  deps: HubDeps = defaultHubDeps(),
  importOrder: ImportOrder = (connection, id) => importChannelOrder(connection, id)
): Promise<{ done: number; failed: number; dead: number }> {
  const now = deps.now()
  const due = await deps.events.listDue(now, MAX_EVENTS_PER_SWEEP)
  const tally = { done: 0, failed: 0, dead: 0 }

  for (const event of due) {
    const attempts = event.attempts + 1
    if (!(await deps.events.claim(event))) continue
    const connection = await deps.connections.findByIdSystem(event.connectionId)
    const connector = connection ? deps.getConnector(connection.connectorKey) : null
    try {
      if (connection && connector?.sales && event.eventType.startsWith("order.")) {
        const orderId = orderIdOf(event.payload)
        if (!orderId) throw new Error("MISSING_ORDER_ID")
        await importOrder(connection, orderId)
      } else {
        if (!connector?.processEvent) throw new Error("NO_PROCESSOR")
        await connector.processEvent({ eventType: event.eventType, payload: event.payload })
      }
      await deps.events.finish(event.id, { status: "DONE" })
      tally.done++
    } catch (err) {
      const errorCode = err instanceof Error ? err.message.slice(0, 64) : "UNKNOWN"
      const outcome = outcomeAfterFailure(attempts, now)
      await deps.events.finish(event.id, {
        status: outcome.status,
        nextRetryAt: outcome.status === "FAILED" ? outcome.nextRetryAt : null,
        errorCode,
      })
      if (outcome.status === "DEAD") {
        tally.dead++
        await deps.notify({ organizationId: event.organizationId, eventKey: "INTEGRATION_EVENT_DEAD" })
      } else tally.failed++
      log.warn("integration.event.failed", { eventId: event.id, attempts, errorCode })
    }
  }
  return tally
}
