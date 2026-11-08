import type { Prisma } from "@/generated/prisma/client"

import { isOrderClosed, isShareActive, type OrderShareFacts } from "../domain/order-share"

type ShareLevel = OrderShareFacts["level"]
type SharesDb = Pick<Prisma.TransactionClient, "shared_order_access">
type ReadDb = Pick<Prisma.TransactionClient, "shared_order_access" | "orders" | "order_events">

/**
 * ADR-014 D-P6, bước P-4: đưa quyền xem đơn về đúng tập `want` (bên nhận → mức). Bên có quyền mà không còn trong
 * `want` → thu hồi; bên mới → cấp; bên đã bị thu hồi mà được mời lại → cấp lại. Gọi trong cùng giao dịch với lệnh đổi
 * phiên điều phối.
 */
export async function syncOrderShares(
  db: SharesDb,
  organizationId: string,
  orderId: string,
  want: ReadonlyMap<string, ShareLevel>,
  now: Date = new Date(),
): Promise<void> {
  const rows = await db.shared_order_access.findMany({
    where: { organization_id: organizationId, order_id: orderId },
    select: { id: true, branch_key: true, level: true, revoked_at: true },
  })
  const byKey = new Map(rows.map((r) => [r.branch_key, r]))
  for (const r of rows) {
    if (!r.revoked_at && !want.has(r.branch_key)) {
      await db.shared_order_access.update({ where: { id: r.id }, data: { revoked_at: now } })
    }
  }
  for (const [branchKey, level] of want) {
    const r = byKey.get(branchKey)
    if (!r) {
      await db.shared_order_access.create({ data: { organization_id: organizationId, order_id: orderId, branch_key: branchKey, level } })
    } else if (r.revoked_at || r.level !== level) {
      await db.shared_order_access.update({ where: { id: r.id }, data: { level, revoked_at: null, ...(r.revoked_at ? { granted_at: now } : {}) } })
    }
  }
}

/** Bên `branchKey` còn được xem đơn không (đã tính thu hồi và hạn sau khi đơn đóng). */
export async function hasActiveOrderShare(
  db: ReadDb,
  organizationId: string,
  orderId: string,
  branchKey: string,
  now: Date = new Date(),
): Promise<boolean> {
  const [share, order] = await Promise.all([
    db.shared_order_access.findFirst({
      where: { organization_id: organizationId, order_id: orderId, branch_key: branchKey },
      select: { level: true, revoked_at: true },
    }),
    db.orders.findFirst({
      where: { id: orderId, organization_id: organizationId },
      select: { status: true, delivery_status: true, updated_at: true },
    }),
  ])
  if (!share || !order) return false
  const facts = { status: order.status, deliveryStatus: order.delivery_status }
  let closedAt: Date | null = null
  if (isOrderClosed(facts)) {
    const closing = await db.order_events.findFirst({
      where: {
        organization_id: organizationId, order_id: orderId,
        OR: [{ axis: "order", to_value: { in: ["COMPLETED", "CANCELLED"] } }, { axis: "delivery", to_value: "DELIVERED" }],
      },
      orderBy: { created_at: "asc" },
      select: { created_at: true },
    })
    closedAt = closing?.created_at ?? order.updated_at // đơn cũ không có sự kiện đóng: lần sửa cuối
  }
  return isShareActive({ level: share.level, revokedAt: share.revoked_at }, { ...facts, closedAt }, now)
}
