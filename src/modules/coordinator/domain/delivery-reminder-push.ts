/**
 * Mốc nhắc nào được ĐẨY thành tin (checklist 4.32). Thanh nhắc `/dieu-phoi` vẫn hiện mọi mốc; tin đẩy chỉ cho
 * M1 (bắt đầu làm) và M2 (chuẩn bị giao), và chỉ khi mốc vừa tới trong `PUSH_WINDOW_MINUTES` — mốc đã quá lâu
 * (vd. lần đầu bật tính năng) không dội tin hàng loạt. Pure — không I/O.
 */
import type { ActiveReminderItem, CoordinatorMilestoneCode } from "./dispatch-reminder-types"

export const PUSHED_MILESTONES: readonly CoordinatorMilestoneCode[] = ["M1", "M2"]
export const PUSH_WINDOW_MINUTES = 30
/** Phạm vi khoá chống gửi trùng trong `idempotency_keys`. */
export const DELIVERY_REMINDER_PUSH_SCOPE = "notification.delivery_reminder"

export interface DeliveryReminderPush {
  orderId: string
  orderCode: string
  milestone: CoordinatorMilestoneCode
  dedupeKey: string
  title: string
  message: string
}

export function dueDeliveryReminderPushes(reminders: readonly ActiveReminderItem[], now: Date): DeliveryReminderPush[] {
  const windowStart = now.getTime() - PUSH_WINDOW_MINUTES * 60_000
  return reminders
    .filter((r) => PUSHED_MILESTONES.includes(r.milestone) && r.scheduledAt.getTime() <= now.getTime() && r.scheduledAt.getTime() >= windowStart)
    .map((r) => ({
      orderId: r.orderId,
      orderCode: r.orderCode,
      milestone: r.milestone,
      dedupeKey: `${r.orderId}:${r.milestone}`,
      title: `${r.title} — đơn #${r.orderCode}`,
      message: r.messageTemplate,
    }))
}
