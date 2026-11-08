/**
 * Luật đầu vào khi TẠO đơn (mọi cổng: nhập tay, chat, catalog công khai, Điều phối) — PO 07/11/2026:
 * Q11 — không tạo đơn với ngày giao đã qua; Q12 — số điện thoại người nhận chỉ nhận số Việt Nam.
 * Thuần, không Prisma.
 */

import { VN_PHONE, normalizeInquiryPhone } from "@/modules/crm/domain/product-inquiry"
import { vnTodayIso } from "@/lib/vn-date"

export const PAST_DELIVERY_MESSAGE = "Ngày giao đã qua — chọn từ hôm nay trở đi."
export const VN_PHONE_MESSAGE = "Số điện thoại người nhận phải là số Việt Nam (vd. 0912 345 678)."

/** Số điện thoại Việt Nam sau khi bỏ dấu cách, chấm, gạch: `0xxxxxxxxx` hoặc `+84xxxxxxxxx`. */
export function isVietnamPhone(raw: string): boolean {
  return VN_PHONE.test(normalizeInquiryPhone(raw.trim()))
}

/** Ngày `YYYY-MM-DD` trước hôm nay theo giờ Việt Nam. */
export function isPastVnDate(date: string, now: Date = new Date()): boolean {
  return date < vnTodayIso(now)
}

/** Lỗi theo trường (tiếng Việt); rỗng = hợp lệ. */
export function newOrderDeliveryErrors(
  input: { deliveryDate?: string | null | undefined; recipientPhone?: string | null | undefined },
  now: Date = new Date()
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.deliveryDate && isPastVnDate(input.deliveryDate, now)) errors.deliveryDate = PAST_DELIVERY_MESSAGE
  if (input.recipientPhone?.trim() && !isVietnamPhone(input.recipientPhone)) errors.recipientPhone = VN_PHONE_MESSAGE
  return errors
}
