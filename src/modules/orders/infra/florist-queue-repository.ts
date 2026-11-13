/**
 * Hàng đợi chế tác (checklist ALG 4.13): việc cắm đang giao cho từng thợ qua `order_assignments`.
 * Một đơn có thể được phân công lại — chỉ phân công mới nhất chưa thu hồi (`released_at` rỗng) còn hiệu lực.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedWhere } from "@/core/tenancy"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"

export const FLORIST_QUEUE_MAX = 100
const ACTIVE_PRODUCTION = ["ASSIGNED", "ARRANGING", "QUALITY_CHECK"] as const

export class FloristQueueRepository {
  /** Phân công còn hiệu lực; `assigneeId` rỗng = mọi thợ trong phạm vi chi nhánh của người xem. */
  async listActive(ctx: TenantContext, assigneeId: string | null) {
    return prisma.order_assignments.findMany({
      where: scopedWhere(ctx, {
        released_at: null,
        ...(assigneeId ? { assignee_id: assigneeId } : {}),
        order: {
          status: { notIn: ["CANCELLED" as const, "COMPLETED" as const] },
          production_status: { in: [...ACTIVE_PRODUCTION] },
          ...branchScopedWhere(ctx),
        },
      }),
      orderBy: { assigned_at: "asc" },
      take: FLORIST_QUEUE_MAX,
      select: {
        id: true, assignee_id: true, difficulty: true, assigned_at: true,
        order: {
          select: {
            id: true, code: true, production_status: true, card_message: true, delivery_window: true,
            items: { select: { description: true, quantity: true, metadata: true } },
          },
        },
      },
    })
  }

  /** Phân công còn hiệu lực của một đơn (mới nhất), trong tổ chức. */
  async activeForOrder(ctx: TenantContext, orderId: string) {
    return prisma.order_assignments.findFirst({
      where: scopedWhere(ctx, { order_id: orderId, released_at: null }),
      orderBy: { assigned_at: "desc" },
      select: { id: true, assignee_id: true },
    })
  }

  /** Thu hồi mọi phân công còn hiệu lực của đơn — gọi trước khi giao cho thợ khác. */
  async releaseActive(ctx: TenantContext, orderId: string): Promise<void> {
    await prisma.order_assignments.updateMany({
      where: scopedWhere(ctx, { order_id: orderId, released_at: null }),
      data: { released_at: new Date() },
    })
  }

  /** Người nhận việc phải là thành viên đang hoạt động của chính tổ chức. */
  async isActiveMember(ctx: TenantContext, userId: string): Promise<boolean> {
    const row = await prisma.memberships.findFirst({
      where: scopedWhere(ctx, { user_id: userId, status: "ACTIVE" as const }),
      select: { id: true },
    })
    return row !== null
  }

  async memberNames(ctx: TenantContext, userIds: readonly string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()
    const rows = await prisma.memberships.findMany({
      where: scopedWhere(ctx, { user_id: { in: [...userIds] } }),
      select: { user_id: true, user: { select: { name: true, email: true } } },
    })
    return new Map(rows.map((r) => [r.user_id, r.user.name ?? r.user.email]))
  }
}
