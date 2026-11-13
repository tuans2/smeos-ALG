/**
 * Đọc hàng đợi lead (`domain/lead-queue.ts`). Chỉ ĐỌC; mọi truy vấn lọc theo tổ chức của `ctx`.
 * Phiên Thẻ chào đọc thẳng `greeting_sessions` — không gọi, không sửa mã Thẻ chào.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import { OPEN_LEAD_STATUSES } from "@/modules/acquisition/domain/lead-recovery"

export const LEAD_QUEUE_MAX_PER_KIND = 100
const PRE_ORDER_SESSION_STATUSES = ["CREATED", "OPENED", "BROWSING", "SELECTED"]

export class LeadQueueRepository {
  async openLeads(ctx: TenantContext, assigneeUserId: string | null) {
    return prisma.leads.findMany({
      where: scopedWhere(ctx, {
        status: { in: [...OPEN_LEAD_STATUSES] },
        ...(assigneeUserId ? { OR: [{ assignee_user_id: assigneeUserId }, { assignee_user_id: null }] } : {}),
      }),
      orderBy: { created_at: "desc" },
      take: LEAD_QUEUE_MAX_PER_KIND,
      select: {
        id: true, name: true, phone: true, source: true, reason: true, status: true,
        assignee_user_id: true, next_follow_up_at: true, updated_at: true,
      },
    })
  }

  /** Phiên Thẻ chào chưa thành đơn, còn hiệu lực (chưa thu hồi, chưa hết hạn). */
  async openBrochureSessions(ctx: TenantContext, saleId: string | null, now: Date) {
    return prisma.greeting_sessions.findMany({
      where: scopedWhere(ctx, {
        order_id: null,
        revoked_at: null,
        status: { in: PRE_ORDER_SESSION_STATUSES },
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
        ...(saleId ? { sale_id: saleId } : {}),
      }),
      orderBy: { last_active_at: "desc" },
      take: LEAD_QUEUE_MAX_PER_KIND,
      select: { id: true, send_code: true, customer_name: true, customer_phone: true, status: true, sale_id: true, last_active_at: true },
    })
  }
}
