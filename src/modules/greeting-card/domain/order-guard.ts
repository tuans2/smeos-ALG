/**
 * Chặn đơn trùng và đơn rác trên link công khai (không đăng nhập). Pure TypeScript.
 * - Trùng: cùng SĐT người đặt, cùng mẫu, cùng người nhận, cùng ngày giao trong vài phút → trả lại đơn đã có.
 * - Rác: ô bẫy ẩn (người thật không thấy, máy tự điền) + trần số đơn theo SĐT mỗi giờ.
 */

export const DUPLICATE_ORDER_WINDOW_MS = 10 * 60_000
export const MAX_ORDERS_PER_PHONE_PER_HOUR = 5
export const TOO_MANY_ORDERS_MESSAGE = "Số điện thoại này vừa đặt nhiều đơn. Vui lòng thử lại sau hoặc liên hệ cửa hàng."

/** Ô bẫy `website` có giá trị → gần như chắc là máy tự điền. */
export function isLikelyBot(honeypot: string | null | undefined): boolean {
  return typeof honeypot === "string" && honeypot.trim().length > 0
}

/** Đơn đã có có phải cùng một lần đặt (khách bấm lại / mạng chập chờn) không. */
export function isSameOrder(
  existing: { recipientPhone: string | null; deliveryDate: string | null },
  incoming: { recipientPhone: string; deliveryDate: string },
): boolean {
  return existing.recipientPhone === incoming.recipientPhone && existing.deliveryDate === incoming.deliveryDate
}
