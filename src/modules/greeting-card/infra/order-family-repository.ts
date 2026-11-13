import { prisma } from "@/core/tenancy/infra/prisma"
import { MAX_FAMILY_SIZE } from "../domain/order-family"

const fromCodeOf = (metadata: unknown): string | null => {
  const v = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>).fromSendCode : null
  return typeof v === "string" && v.length > 0 ? v : null
}

/**
 * Đọc nhóm phiên "đặt thêm đơn" của một phiên, trong ĐÚNG tổ chức của phiên đó: lùi về phiên gốc theo
 * `REORDER.fromSendCode`, rồi đi xuôi lấy mọi phiên đặt thêm. Có trần `MAX_FAMILY_SIZE` và chống vòng lặp.
 */
export class OrderFamilyRepository {
  constructor(private readonly db = prisma) {}

  private async parentCode(organizationId: string, sessionId: string): Promise<string | null> {
    const ev = await this.db.greeting_journey_events.findFirst({
      where: { organization_id: organizationId, session_id: sessionId, event_type: "REORDER" },
      select: { metadata: true },
      orderBy: { created_at: "asc" },
    })
    return ev ? fromCodeOf(ev.metadata) : null
  }

  async familyOf(organizationId: string, session: { id: string; send_code: string }) {
    // 1. Lùi về phiên gốc
    let root = session
    const seen = new Set([session.send_code])
    for (let i = 0; i < MAX_FAMILY_SIZE; i++) {
      const from = await this.parentCode(organizationId, root.id)
      if (!from || seen.has(from)) break
      const parent = await this.db.greeting_sessions.findUnique({
        where: { organization_id_send_code: { organization_id: organizationId, send_code: from } },
        select: { id: true, send_code: true },
      })
      if (!parent) break
      seen.add(parent.send_code)
      root = parent
    }

    // 2. Đi xuôi: mọi phiên đặt thêm từ các phiên đã biết
    const codes = [root.send_code]
    let frontier = [root.send_code]
    while (frontier.length > 0 && codes.length < MAX_FAMILY_SIZE) {
      const children = await this.db.greeting_journey_events.findMany({
        where: {
          organization_id: organizationId,
          event_type: "REORDER",
          OR: frontier.map((code) => ({ metadata: { path: ["fromSendCode"], equals: code } })),
        },
        select: { session: { select: { send_code: true } } },
        take: MAX_FAMILY_SIZE,
      })
      const next = [...new Set(children.map((c) => c.session.send_code))].filter((c) => !codes.includes(c))
      codes.push(...next.slice(0, MAX_FAMILY_SIZE - codes.length))
      frontier = next
    }

    const rows = await this.db.greeting_sessions.findMany({
      where: { organization_id: organizationId, send_code: { in: codes } },
      select: {
        send_code: true, created_at: true, expires_at: true, revoked_at: true, product_snapshot: true,
        order: { select: { code: true, status: true, delivery_status: true, total_vnd: true, paid_vnd: true, delivery_window: true } },
      },
      orderBy: { created_at: "asc" },
    })
    return { rootSendCode: root.send_code, rows }
  }
}

let _orderFamilyRepositorySingleton: OrderFamilyRepository | null = null
export function getOrderFamilyRepository(): OrderFamilyRepository {
  if (!_orderFamilyRepositorySingleton) _orderFamilyRepositorySingleton = new OrderFamilyRepository()
  return _orderFamilyRepositorySingleton
}
