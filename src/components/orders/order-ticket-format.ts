import type { DeliveryWindow } from "@/modules/orders/domain/order-types"

/**
 * Chữ hiển thị trên phiếu thợ/phiếu giao xem trước ở chi tiết đơn (audit hành trình U2, gói UJ-07): trước đây
 * đơn chưa hẹn giờ hiện "undefined (undefined)", thiệp trống thì in "Chúc mừng ngày đặc biệt!" và phí ship
 * luôn "0 đ" — dữ liệu khách không hề nhập.
 */
export function formatDeliveryWindow(window: DeliveryWindow | null | undefined): string {
  if (!window?.date) return "Chưa hẹn ngày giao"
  return window.timeSlot ? `${window.date} (${window.timeSlot})` : window.date
}
