/**
 * Nhật ký sự kiện tích hợp. Ghi vào chống trùng bằng unique (connection, direction, external_event_id);
 * lượt xử lý nhận việc bằng cập nhật có điều kiện để hai tiến trình không xử lý cùng một sự kiện.
 */

import type { Prisma, integration_events } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { ACTIVE_ORGANIZATION_ONLY } from "@/modules/organization/infra/active-organization-filter"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { EventStatus, EventView } from "../domain/integration-views"

export type { EventStatus, EventView }

export interface ClaimedEvent extends EventView {
  readonly organizationId: string
}

function toView(row: integration_events): ClaimedEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    connectionId: row.connection_id,
    direction: row.direction,
    eventType: row.event_type,
    status: row.status,
    attempts: row.attempts,
    nextRetryAt: row.next_retry_at?.toISOString() ?? null,
    errorCode: row.error_code,
    payload: row.payload_redacted,
    createdAt: row.created_at.toISOString(),
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002"
}

export class EventRepository {
  /** Ghi sự kiện vào (webhook). `duplicate` = nhà cung cấp gửi lại sự kiện đã nhận. */
  async recordInbound(input: {
    organizationId: string
    connectionId: string
    externalEventId: string | null
    eventType: string
    payloadRedacted: unknown
    /** Sự kiện đã xử lý ngay tại route riêng (đầu nối MANAGED): ghi thẳng kết quả, không vào hàng chờ. */
    finalStatus?: "DONE" | "DEAD"
    errorCode?: string | null
  }): Promise<{ id: string | null; duplicate: boolean }> {
    try {
      const row = await prisma.integration_events.create({
        data: {
          organization_id: input.organizationId,
          connection_id: input.connectionId,
          direction: "IN",
          event_type: input.eventType,
          external_event_id: input.externalEventId,
          payload_redacted: (input.payloadRedacted ?? {}) as Prisma.InputJsonValue,
          ...(input.finalStatus ? { status: input.finalStatus, attempts: 1, error_code: input.errorCode ?? null } : {}),
        },
      })
      return { id: row.id, duplicate: false }
    } catch (err) {
      if (isUniqueViolation(err)) return { id: null, duplicate: true }
      throw err
    }
  }

  async list(
    ctx: TenantContext,
    connectionId: string,
    options: { status?: EventStatus; limit: number }
  ): Promise<EventView[]> {
    const rows = await prisma.integration_events.findMany({
      where: scopedWhere(ctx, { connection_id: connectionId, ...(options.status ? { status: options.status } : {}) }),
      orderBy: { created_at: "desc" },
      take: Math.min(Math.max(options.limit, 1), 100),
    })
    return rows.map(toView)
  }

  async countByStatusSince(ctx: TenantContext, status: EventStatus, since: Date): Promise<number> {
    return prisma.integration_events.count({ where: scopedWhere(ctx, { status, created_at: { gte: since } }) })
  }

  /** Sự kiện đến hạn xử lý (xuyên tổ chức — chỉ gọi từ lượt cron). */
  async listDue(now: Date, limit: number): Promise<ClaimedEvent[]> {
    const rows = await prisma.integration_events.findMany({
      where: {
        direction: "IN",
        OR: [{ status: "PENDING" }, { status: "FAILED", next_retry_at: { lte: now } }],
        ...ACTIVE_ORGANIZATION_ONLY, // UJ-26: sự kiện của tổ chức tạm ngưng nằm chờ tới khi mở lại
      },
      orderBy: { created_at: "asc" },
      take: limit,
    })
    return rows.map(toView)
  }

  /** Nhận việc: tăng `attempts` nếu chưa ai nhận. false = tiến trình khác đã nhận. */
  async claim(event: ClaimedEvent): Promise<boolean> {
    const res = await prisma.integration_events.updateMany({
      where: { id: event.id, attempts: event.attempts, status: { in: ["PENDING", "FAILED"] } },
      data: { attempts: { increment: 1 } },
    })
    return res.count === 1
  }

  async finish(id: string, outcome: { status: EventStatus; nextRetryAt?: Date | null; errorCode?: string | null }) {
    await prisma.integration_events.update({
      where: { id },
      data: { status: outcome.status, next_retry_at: outcome.nextRetryAt ?? null, error_code: outcome.errorCode ?? null },
    })
  }

  /** Kết nối của sự kiện (để biết sự kiện có xử lý lại được không) — của chính tổ chức. */
  async connectionIdOf(ctx: TenantContext, id: string): Promise<string | null> {
    const row = await prisma.integration_events.findFirst({ where: scopedWhere(ctx, { id }), select: { connection_id: true } })
    return row?.connection_id ?? null
  }

  /** Người dùng bấm "Thử lại": chỉ sự kiện lỗi/hết lượt, của chính tổ chức. */
  async resetForReplay(ctx: TenantContext, id: string): Promise<boolean> {
    const res = await prisma.integration_events.updateMany({
      where: scopedWhere(ctx, { id, status: { in: ["FAILED" as const, "DEAD" as const] } }),
      data: { status: "PENDING", attempts: 0, next_retry_at: null, error_code: null },
    })
    return res.count === 1
  }
}

let _repo: EventRepository | null = null
export function getEventRepository(): EventRepository {
  if (!_repo) _repo = new EventRepository()
  return _repo
}
