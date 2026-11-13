/**
 * Bảng việc Điều phối (PO 08/10/2026, Đợt 2-G): MỌI đơn còn việc ở xưởng/giao — không cắt theo trang —
 * xếp theo ngày + giờ giao gần nhất để ngày lễ không sót đơn đặt sớm. Pure TypeScript.
 */
import { DELIVERY_SLOTS, parseCustomTime, isCustomTimeSlot } from "./delivery-schedule"

/** Trần an toàn số đơn một lần tải (ngày lễ ~200–400 đơn còn việc). */
export const COORDINATOR_BOARD_MAX = 1000
/** Đơn đã giao vẫn hiện ở mục "Xong" thêm 24 giờ. */
export const DONE_VISIBLE_MS = 24 * 3_600_000

/** Giờ bắt đầu (thập phân) của khung giờ đã lưu; không có khung → cuối ngày (xếp sau). */
export function slotStartHour(timeSlot: string | null | undefined): number {
  const value = timeSlot?.trim()
  if (!value) return 24
  if (isCustomTimeSlot(value)) return parseCustomTime(value) ?? 24
  return DELIVERY_SLOTS.find((s) => s.label === value)?.startHour ?? 24
}

/** Khoá xếp: ngày giao (thiếu → cuối), giờ bắt đầu khung, rồi đơn đặt trước lên trước. */
export function deliverySortKey(order: { delivery_window?: unknown; created_at: Date | string }): string {
  const w = (order.delivery_window ?? {}) as { date?: unknown; timeSlot?: unknown }
  const date = typeof w.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(w.date) ? w.date : "9999-12-31"
  const hour = slotStartHour(typeof w.timeSlot === "string" ? w.timeSlot : null)
  const created = typeof order.created_at === "string" ? order.created_at : order.created_at.toISOString()
  return `${date}|${hour.toFixed(2).padStart(5, "0")}|${created}`
}

export function sortByDelivery<T extends { delivery_window?: unknown; created_at: Date | string }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => deliverySortKey(a).localeCompare(deliverySortKey(b)))
}
