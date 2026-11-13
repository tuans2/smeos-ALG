/**
 * Bộ nhắc: đơn giao trước, thu sau đã quá hạn thu mà còn nợ → nhắc Sale phụ trách (OWNER) và báo Điều hành
 * (quan sát). Nhắc 2 ngày một lần, tối đa 3 lần; lần 3 báo thêm Điều hành mức khẩn (PO 12/11/2026, audit BL-29).
 * Chạy cùng bộ quét Đơn hàng (`orders-sweep-scheduler.ts`).
 */

import { log } from "@/core/observability/log"
import { formatCurrency } from "@/lib/i18n/formatters"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { COLLECT_DUE_MAX_REMINDERS } from "../domain/collect-due-reminder"
import { CollectDueRepository } from "../infra/collect-due-repository"

const BATCH = 100

export async function remindCollectDue(
  now = new Date(),
  repo: Pick<CollectDueRepository, "listOverdue" | "markReminded"> = new CollectDueRepository(),
  notify: typeof notifyOrganization = notifyOrganization,
) {
  const rows = await repo.listOverdue(now, BATCH)
  let reminded = 0
  let escalated = 0
  for (const r of rows) {
    const attempt = Math.min(COLLECT_DUE_MAX_REMINDERS, (r.order.events?.length ?? 0) + 1)
    const balance = formatCurrency(Number(r.order.balance_vnd))
    try {
      // Đánh dấu trước: lỗi gửi không làm nhắc lặp mỗi phút (thông báo là best-effort)
      await repo.markReminded(r.organization_id, r.order.id, r.order.status, attempt)
      await notify({
        organizationId: r.organization_id,
        eventKey: "ORDER_COLLECT_DUE",
        ownerUserId: r.order.owner_sale_id ?? r.requested_by,
        title: attempt > 1 ? `Tới hạn thu tiền (nhắc lần ${attempt}) — đơn ${r.order.code}` : `Tới hạn thu tiền — đơn ${r.order.code}`,
        message: `Còn phải thu ${balance}.`,
        deepLink: "/don-hang?tab=sale",
      })
      if (attempt === COLLECT_DUE_MAX_REMINDERS) {
        await notify({
          organizationId: r.organization_id,
          eventKey: "ORDER_COLLECT_DUE_ESCALATED",
          title: `Nợ quá hạn đã nhắc ${attempt} lần — đơn ${r.order.code}`,
          message: `Còn phải thu ${balance}. Sale đã được nhắc ${attempt} lần mà chưa thu được — cần Điều hành xử lý.`,
          deepLink: "/don-hang?tab=sale",
        })
        escalated += 1
      }
      reminded += 1
    } catch (error: unknown) {
      log.warn("orders.collect_due_remind_failed", { organizationId: r.organization_id, feature: "orders", message: error instanceof Error ? error.message : String(error) })
    }
  }
  return { scanned: rows.length, reminded, escalated }
}
