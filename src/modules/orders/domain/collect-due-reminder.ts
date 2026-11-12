/**
 * Nhắc thu tiền đơn giao trước, thu sau đã quá hạn (PO 12/11/2026, audit BL-29): nhắc 2 ngày một lần, tối đa 3 lần;
 * lần thứ 3 báo thêm Điều hành. Trước đây mỗi đơn chỉ được nhắc đúng một lần. Thuần.
 */
export const COLLECT_DUE_REMINDER_REASON = "Nhắc thu tiền: đã quá hạn thu sau khi giao trước"
export const COLLECT_DUE_MAX_REMINDERS = 3
export const COLLECT_DUE_REMIND_EVERY_MS = 2 * 24 * 60 * 60 * 1000

/** Lý do ghi vào `order_events` cho lần nhắc thứ `n` (1..3). Lần 1 giữ đúng chuỗi cũ để đơn đã nhắc trước đây được tính. */
export function collectDueReminderReason(n: number): string {
  return n <= 1 ? COLLECT_DUE_REMINDER_REASON : `${COLLECT_DUE_REMINDER_REASON} (lần ${n})`
}

/** Mọi lý do nhắc — để đếm số lần đã nhắc. */
export const COLLECT_DUE_REMINDER_REASONS: readonly string[] = Array.from({ length: COLLECT_DUE_MAX_REMINDERS }, (_, i) => collectDueReminderReason(i + 1))
