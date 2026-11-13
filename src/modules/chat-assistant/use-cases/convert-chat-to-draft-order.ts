/**
 * Use-case: Convert Chat To Draft Order (1-chạm chốt đơn sang M10 từ gợi ý của bot).
 */

import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { getProductMasterIndex } from "@/modules/products/use-cases/get-product-master-index"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import { hasRealPrice, formatQuotePriceForChat } from "../domain/flower-consultant-rules"
import { ChatRepository, getChatRepository } from "../infra/chat-repository"

export async function convertChatToDraftOrder(
  ctx: TenantContext,
  conversationId: string,
  productId: string,
  customerInfo?: {
    recipientName?: string | undefined
    phone?: string | undefined
    street?: string | undefined
    cardMessage?: string | undefined
  },
  repo: ChatRepository = getChatRepository()
) {
  const conversation = await repo.getConversation(ctx, conversationId)
  if (!conversation) {
    throw notFound()
  }

  const product = await getProductMasterIndex(ctx, productId)
  if (!product) {
    throw notFound()
  }

  // Chưa có giá bán lẻ thật cấu hình cho sản phẩm này (đúng thiết kế theo quyết định 17/09,
  // nợ #87: hệ thống không lưu giá niêm yết tĩnh, Master Index trả `null` khi chưa có giá
  // qua `quotePrice()`). KHÔNG tự tạo đơn với giá 0đ; chặn lại và yêu cầu nhập giá tay,
  // giống hệt nguyên tắc "không bịa giá" đã áp dụng cho Thẻ chào A6.
  //
  // Đọc vào biến cục bộ TRƯỚC khi gác cổng — để `hasRealPrice` (vị từ kiểu `is number`)
  // thu hẹp đúng biến này, không phải biểu thức truy cập thuộc tính lặp lại.
  const priceVnd = product.pricing.quotePriceVnd
  if (!hasRealPrice(priceVnd)) {
    throw validationFailed({
      priceVnd: `Sản phẩm "${product.name}" chưa có giá bán cấu hình. Vui lòng tạo đơn thủ công và nhập giá trước khi chốt.`,
    })
  }

  // Tạo đơn nháp chỉ với thông tin khách đã cho — KHÔNG điền SĐT, người nhận, địa chỉ hay lời chúc mặc định (audit
  // BL-25: lời chúc bịa từng có thể bị in lên thiệp). Trường thiếu được mở yêu cầu bổ sung (`syncOrderInfoRequests`).
  const order = await ingestOrder(ctx, {
    source: "CHAT",
    customerId: conversation.customerId,
    ...(customerInfo?.cardMessage?.trim() ? { cardMessage: customerInfo.cardMessage.trim() } : {}),
    internalNote: `[Tạo tự động từ AI Chatbot] Mẫu: ${product.name}. Gói: ${product.bom.wrapStyle}`,
    ...chatDeliveryAddress(customerInfo),
    items: [
      {
        productId: product.id,
        description: `${product.name} [${product.code}]`,
        quantity: 1,
        unitPriceVnd: priceVnd,
      },
    ],
  })

  // Thêm tin nhắn hệ thống ghi nhận đơn đã tạo
  await repo.addMessage(
    ctx,
    conversationId,
    "SYSTEM",
    `⚡ Đã khởi tạo thành công Đơn hàng nháp **#${order.code}** (${product.name} — ${formatQuotePriceForChat(priceVnd)}) vào sổ đơn hàng.`,
    { createdOrderId: order.id, orderCode: order.code }
  )

  return { order }
}

/** Địa chỉ giao từ thông tin khách đã cho; không cho gì → không gắn địa chỉ. Trường thiếu để trống, không bịa. */
export function chatDeliveryAddress(info: { recipientName?: string | undefined; phone?: string | undefined; street?: string | undefined } | undefined) {
  const recipientName = info?.recipientName?.trim() ?? ""
  const phone = info?.phone?.trim() ?? ""
  const street = info?.street?.trim() ?? ""
  if (!recipientName && !phone && !street) return {}
  return { deliveryAddress: { recipientName, phone, street } }
}
