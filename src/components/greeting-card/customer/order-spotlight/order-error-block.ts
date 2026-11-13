import type { OrderFocusBlock } from "./order-focus-context"

const PRODUCT_FIELDS = ["variantId", "quantity", "selectedPromotionId", "voucherCode", "paymentCode"]
const BUYER_FIELDS = ["customerName", "customerPhone", "customerEmail"]
const RECIPIENT_FIELDS = ["recipientName", "recipientPhone"]
const NOTE_FIELDS = ["cardMessage", "senderNote", "deliveryNote", "mapUrl", "specialRequests"]

/**
 * Trường lỗi → khối Spotlight chứa nó. Người mua cũng là người nhận → lỗi người nhận thuộc khối Người mua.
 * Trường còn lại (ngày giờ, địa chỉ, khu vực giao, ngày trả phòng…) thuộc khối Giao hàng; không rõ → null.
 */
export function orderErrorBlock(field: string | null | undefined, buyerIsRecipient = false): OrderFocusBlock | null {
  if (!field) return null
  if (PRODUCT_FIELDS.includes(field)) return 1
  if (BUYER_FIELDS.includes(field)) return 2
  if (RECIPIENT_FIELDS.includes(field)) return buyerIsRecipient ? 2 : 3
  if (NOTE_FIELDS.includes(field)) return 4
  return 3
}
