/** Việc "Thiếu thông tin" trong Hộp việc (checklist ALG 4.14): mỗi yêu cầu bổ sung còn mở là một việc. */

import type { TenantContext } from "@/core/tenancy"
import { formatDateTime } from "@/lib/i18n/formatters"
import { listOpenInfoRequests } from "@/modules/orders/use-cases/order-info-requests"
import type { InboxAction } from "../domain/inbox"
import type { MessageRole } from "../domain/internal-message"

/** `saleScope` — Sale "chỉ khách của mình" chỉ thấy yêu cầu do chính mình tạo. */
export async function missingInfoActions(ctx: TenantContext, role: MessageRole, saleScope: string | null, now = new Date()): Promise<InboxAction[]> {
  const requests = (await listOpenInfoRequests(ctx, now)).filter((r) => !saleScope || r.requestedBy === saleScope)
  return requests.map((r) => {
    const overdue = r.status === "OVERDUE"
    return {
      id: `missing-info:${r.id}`, kind: "MISSING_INFO" as const,
      title: `${overdue ? "Quá hạn bổ sung" : "Thiếu"} ${r.label.toLowerCase()}`,
      detail: `Đơn ${r.orderCode} · hỏi ${r.requestedFrom}${r.dueAt ? ` · hạn ${formatDateTime(r.dueAt)}` : ""}`,
      orderId: r.orderId, sessionId: null, customerName: null, imageUrl: null,
      tab: role === "SALE" ? "sales" : "coordinator", urgency: overdue ? 1800 : 900, href: "/don-hang",
    }
  })
}
