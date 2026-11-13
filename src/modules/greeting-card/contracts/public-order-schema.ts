import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { isLikelyBot } from "../domain/order-guard"
import { ORDER_FIELD_MAX } from "../domain/greeting-card-rules"
import { MAX_ORDER_QUANTITY } from "../domain/brochure-pricing"
import { ADDRESS_PART_MAX } from "../domain/delivery-address"
import { DELIVERY_NOTE_MAX, MAP_URL_MAX } from "../domain/delivery-note"

/**
 * Hình dạng thân yêu cầu đặt hoa công khai. Chỉ kiểm kiểu + độ dài ở biên;
 * luật nghiệp vụ (SĐT, ngày giao) nằm ở `validateCustomerOrderInput`.
 */
export const publicOrderBodySchema = z.object({
  customerName: z.string().max(ORDER_FIELD_MAX.name),
  customerPhone: z.string().max(20),
  customerEmail: z.string().max(120).optional(),
  recipientName: z.string().max(ORDER_FIELD_MAX.name),
  recipientPhone: z.string().max(20),
  deliveryDate: z.string().max(10),
  checkOutDate: z.string().max(10).optional(),
  deliveryTimeSlot: z.string().max(ORDER_FIELD_MAX.timeSlot).optional(),
  deliveryAddress: z.string().max(ORDER_FIELD_MAX.address),
  addressParts: z
    .object({
      houseNumber: z.string().max(ADDRESS_PART_MAX),
      street: z.string().max(ADDRESS_PART_MAX),
      ward: z.string().max(ADDRESS_PART_MAX),
      district: z.string().max(ADDRESS_PART_MAX).optional(),
      province: z.string().max(ADDRESS_PART_MAX),
    })
    .optional(),
  cardMessage: z.string().max(ORDER_FIELD_MAX.cardMessage).optional(),
  senderNote: z.string().max(ORDER_FIELD_MAX.senderNote).optional(),
  deliveryNote: z.string().max(DELIVERY_NOTE_MAX).optional(),
  mapUrl: z.string().max(MAP_URL_MAX).optional(),
  variantId: z.string().max(64).optional(),
  quantity: z.number().int().min(1).max(MAX_ORDER_QUANTITY).optional(),
  shippingZoneId: z.string().max(40).optional(),
  voucherCode: z.string().trim().max(40).optional(),
  /** Mã thanh toán (đặt cọc) — KHÔNG phải mã giảm giá; máy chủ kiểm. */
  paymentCode: z.string().trim().max(40).optional(),
  /** Đúng MỘT ưu đãi khách chọn — máy chủ kiểm lại theo bộ sưu tập. */
  selectedPromotionId: z.string().max(80).optional(),
  /** Khách đã tick xác nhận thỏa thuận. */
  confirmedTerms: z.boolean().optional(),
  /** Ô bẫy ẩn — người thật để trống; máy tự điền thì bị từ chối. */
  website: z.string().max(200).optional(),
})

/** Từ chối đơn do máy tự điền ô bẫy (không nói rõ lý do để máy không học được). */
export function rejectBotSubmission(body: { website?: string | undefined }): void {
  if (isLikelyBot(body.website)) throw validationFailed({ body: "Không gửi được đơn, vui lòng thử lại" })
}

/** Báo giá: chỉ các lựa chọn mua (+ SĐT để kiểm mã giảm giá dành riêng một khách). */
export const publicQuoteBodySchema = z.object({
  variantId: z.string().max(64).optional(),
  quantity: z.number().int().min(1).max(MAX_ORDER_QUANTITY).optional(),
  shippingZoneId: z.string().max(40).optional(),
  voucherCode: z.string().trim().max(40).optional(),
  paymentCode: z.string().trim().max(40).optional(),
  customerPhone: z.string().max(20).optional(),
  selectedPromotionId: z.string().max(80).optional(),
  /** Ngày giao — để báo khung giờ đã kín và phụ phí ngày lễ */
  deliveryDate: z.string().max(10).optional(),
  /** Khung giờ giao — phụ phí giờ cao điểm (checklist ALG 3.1) */
  deliveryTimeSlot: z.string().max(40).optional(),
})

export function issuesToDetails(issues: z.core.$ZodIssue[]): Record<string, string> {
  const details: Record<string, string> = {}
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "body")
    details[field] ??= "Giá trị không hợp lệ hoặc quá dài"
  }
  return details
}
