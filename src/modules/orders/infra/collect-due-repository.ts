/**
 * Đơn được giao trước, thu sau đã quá hạn thu mà còn nợ — cho bộ nhắc (P3, §5.0). Không có phiên người dùng:
 * tổ chức lấy từ chính dòng yêu cầu. Mỗi đơn chỉ nhắc một lần (đánh dấu bằng `order_events`).
 */

import { prisma } from "@/core/tenancy/infra/prisma"

export const COLLECT_DUE_REMINDER_REASON = "Nhắc thu tiền: đã quá hạn thu sau khi giao trước"

export class CollectDueRepository {
  /**
   * Loại đơn đã nhắc NGAY TRONG câu truy vấn (audit BL-09): lọc sau `take` thì khi đã có ≥ `take` đơn được nhắc
   * mà chưa trả, đơn quá hạn mới không bao giờ lọt vào trang đầu.
   */
  async listOverdue(now: Date, take: number) {
    return prisma.order_approval_requests.findMany({
      where: {
        kind: "DELIVER_BEFORE_PAY",
        status: { in: ["APPROVED", "AUTO_APPROVED"] },
        collect_due_at: { lt: now },
        order: {
          balance_vnd: { gt: 0 },
          status: { not: "CANCELLED" },
          events: { none: { reason: COLLECT_DUE_REMINDER_REASON } },
        },
      },
      orderBy: { collect_due_at: "asc" },
      take,
      select: {
        organization_id: true, requested_by: true, collect_due_at: true,
        order: { select: { id: true, code: true, status: true, balance_vnd: true, owner_sale_id: true } },
      },
    })
  }

  async markReminded(organizationId: string, orderId: string, status: string): Promise<void> {
    await prisma.order_events.create({
      data: { organization_id: organizationId, order_id: orderId, axis: "order", from_value: status, to_value: status, actor_id: "system:collect-due", reason: COLLECT_DUE_REMINDER_REASON },
    })
  }
}
