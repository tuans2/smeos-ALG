/**
 * Đơn được giao trước, thu sau đã quá hạn thu mà còn nợ — cho bộ nhắc (P3, §5.0). Không có phiên người dùng:
 * tổ chức lấy từ chính dòng yêu cầu. Nhắc tối đa 3 lần, cách nhau 2 ngày (đánh dấu bằng `order_events`).
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import {
  COLLECT_DUE_MAX_REMINDERS,
  COLLECT_DUE_REMIND_EVERY_MS,
  COLLECT_DUE_REMINDER_REASONS,
  collectDueReminderReason,
} from "../domain/collect-due-reminder"

export { COLLECT_DUE_REMINDER_REASON } from "../domain/collect-due-reminder"

export class CollectDueRepository {
  /**
   * Loại đơn không cần nhắc NGAY TRONG câu truy vấn (audit BL-09): đã đủ 3 lần, hoặc vừa nhắc trong 2 ngày qua — lọc
   * sau `take` thì đơn không cần nhắc chiếm hết trang đầu và đơn quá hạn mới không bao giờ lọt vào.
   */
  async listOverdue(now: Date, take: number) {
    const recent = new Date(now.getTime() - COLLECT_DUE_REMIND_EVERY_MS)
    return prisma.order_approval_requests.findMany({
      where: {
        kind: "DELIVER_BEFORE_PAY",
        status: { in: ["APPROVED", "AUTO_APPROVED"] },
        collect_due_at: { lt: now },
        order: {
          balance_vnd: { gt: 0 },
          status: { not: "CANCELLED" },
          AND: [
            { events: { none: { reason: collectDueReminderReason(COLLECT_DUE_MAX_REMINDERS) } } },
            { events: { none: { reason: { in: [...COLLECT_DUE_REMINDER_REASONS] }, created_at: { gte: recent } } } },
          ],
        },
      },
      orderBy: { collect_due_at: "asc" },
      take,
      select: {
        organization_id: true, requested_by: true, collect_due_at: true,
        order: {
          select: {
            id: true, code: true, status: true, balance_vnd: true, owner_sale_id: true,
            events: { where: { reason: { in: [...COLLECT_DUE_REMINDER_REASONS] } }, select: { id: true } },
          },
        },
      },
    })
  }

  /** Ghi lần nhắc thứ `attempt` (1..3). */
  async markReminded(organizationId: string, orderId: string, status: string, attempt = 1): Promise<void> {
    await prisma.order_events.create({
      data: { organization_id: organizationId, order_id: orderId, axis: "order", from_value: status, to_value: status, actor_id: "system:collect-due", reason: collectDueReminderReason(attempt) },
    })
  }
}
