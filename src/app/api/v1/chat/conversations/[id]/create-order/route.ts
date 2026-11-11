/**
 * POST /api/v1/chat/conversations/[id]/create-order
 * T3: Tạo đơn hàng nhanh từ gợi ý trong hội thoại
 */

import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { convertChatToDraftOrder } from "@/modules/chat-assistant/use-cases/convert-chat-to-draft-order"
import { syncOrderInfoRequests } from "@/modules/orders/use-cases/order-info-requests"

export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "T3")

  const { id } = await context.params
  const body = await request.json()

  if (!body.productId) {
    throw validationFailed({ productId: "Mã sản phẩm hoa là bắt buộc để tạo đơn" })
  }

  const result = await convertChatToDraftOrder(ctx, id, body.productId, {
    recipientName: body.recipientName,
    phone: body.phone,
    street: body.street,
    cardMessage: body.cardMessage,
  })

  // Thông tin khách chưa cho trong chat (SĐT, địa chỉ…) → yêu cầu bổ sung, thay vì điền mặc định (audit BL-25)
  await syncOrderInfoRequests(ctx, result.order.id)
  return jsonResponse(result, { status: 201 })
})
