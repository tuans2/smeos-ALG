/** Nhật ký sự kiện của một kết nối (W1) và "Thử lại" sự kiện lỗi (W5). */

import { requireCapability } from "@/core/rbac/capabilities"
import { AppError, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { EventStatus, EventView } from "../infra/event-repository"
import { defaultHubDeps, type HubDeps } from "./hub-deps"

export async function listConnectionEvents(
  ctx: TenantContext,
  input: { connectionId: string; status?: EventStatus; limit?: number },
  deps: HubDeps = defaultHubDeps()
): Promise<EventView[]> {
  requireCapability(ctx, "W1")
  const connection = await deps.connections.get(ctx, input.connectionId)
  if (!connection) throw notFound()
  return deps.events.list(ctx, input.connectionId, {
    ...(input.status ? { status: input.status } : {}),
    limit: input.limit ?? 50,
  })
}

export async function replayEvent(ctx: TenantContext, eventId: string, deps: HubDeps = defaultHubDeps()): Promise<void> {
  requireCapability(ctx, "W5")
  const connectionId = await deps.events.connectionIdOf(ctx, eventId)
  if (!connectionId) throw notFound()
  const connection = await deps.connections.get(ctx, connectionId)
  // Tích hợp MANAGED xử lý tin ngay tại route riêng — không có bộ xử lý lại; nhân viên trả lời từ Hội thoại.
  if (!connection || !deps.getConnector(connection.connectorKey)?.processEvent) {
    throw new AppError("UNPROCESSABLE_ENTITY", "Sự kiện này không xử lý lại được từ đây")
  }
  const reset = await deps.events.resetForReplay(ctx, eventId)
  if (!reset) throw notFound()
  await deps.audit(ctx, { action: "integration.event.replay", entityType: "integration_event", entityId: eventId })
}
