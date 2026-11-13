/**
 * Phân tầng thời gian hiển thị đơn hàng (PO 14/10/2026):
 * - OVERDUE: Quá hạn giao hoặc kẹt bước xử lý
 * - URGENT: Sắp đến hạn (< 60-90 phút)
 * - CURRENT: Trong ca hiện tại (hôm nay)
 * - FUTURE: Ca sau / Ngày mai / Đặt trước
 */
import { slotStartHour } from "./coordinator-board"

export type OrderTimeTier = "OVERDUE" | "URGENT" | "CURRENT" | "FUTURE"

const VN_OFFSET_MS = 7 * 3_600_000

export interface OrderTimeContext {
  deliveryDate?: string | null | undefined
  deliveryTimeSlot?: string | null | undefined
  isStuck?: boolean | undefined
  slaState?: "NONE" | "ON_TRACK" | "DUE_SOON" | "OVERDUE" | undefined
}

export function classifyOrderTimeTier(
  ctx: OrderTimeContext,
  nowMs: number = Date.now()
): OrderTimeTier {
  // 1. Nếu có cờ stuck hoặc SLA báo OVERDUE
  if (ctx.isStuck || ctx.slaState === "OVERDUE") {
    return "OVERDUE"
  }

  // 2. Nếu có cờ SLA báo DUE_SOON (sắp quá hạn)
  if (ctx.slaState === "DUE_SOON") {
    return "URGENT"
  }

  // 3. Tính theo mốc giao hàng (deliveryDate + deliveryTimeSlot)
  const d = ctx.deliveryDate?.trim()
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    // Không có ngày giao -> xếp vào CURRENT để xử lý
    return "CURRENT"
  }

  const vnNow = new Date(nowMs + VN_OFFSET_MS)
  const todayStr = vnNow.toISOString().slice(0, 10)
  const currentHour = vnNow.getUTCHours() + vnNow.getUTCMinutes() / 60

  // Ngày giao nhỏ hơn hôm nay -> Đã quá hạn
  if (d < todayStr) {
    return "OVERDUE"
  }

  // Ngày giao lớn hơn hôm nay -> Tương lai (ngày mai / đặt trước)
  if (d > todayStr) {
    return "FUTURE"
  }

  // Hôm nay (d === todayStr)
  const startHour = slotStartHour(ctx.deliveryTimeSlot)

  // Nếu khung giờ đã qua hơn 30 phút mà chưa xong -> Quá hạn
  if (startHour !== 24 && currentHour > startHour + 2) {
    return "OVERDUE"
  }

  // Nếu khung giờ sắp tới trong vòng 1.5 giờ (< 90 phút) hoặc đang trong khung giờ
  if (startHour !== 24) {
    const diffHours = startHour - currentHour
    // Đang trong khung giờ hoặc cách dưới 1.5 giờ
    if (diffHours <= 1.5 && diffHours >= -2) {
      return "URGENT"
    }
    // Khung giờ sau trong ngày (> 1.5 giờ)
    if (diffHours > 1.5) {
      return "CURRENT"
    }
  }

  return "CURRENT"
}
