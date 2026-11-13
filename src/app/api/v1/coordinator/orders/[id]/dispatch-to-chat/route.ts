import { jsonResponse } from "@/core/http/response"
import { validationFailed, notFound } from "@/core/http/errors"
import { getOrderRepository } from "@/modules/orders/infra/order-repository"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { DispatchOrderToChatUseCase } from "@/modules/internal-chat/use-cases/dispatch-order-to-chat"
import { isActivePartnerTarget } from "@/modules/chain-partnership/infra/partner-link-guard"
import { formatCardAddress } from "@/modules/internal-chat/domain/card-address"
import { dispatchToChatBody } from "@/app/api/v1/_contracts/requests-coordinator"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, resolved, params }) => {
    const { id: orderId } = params as { id: string }
    const body = await request.json().catch(() => null)
    const parsed = dispatchToChatBody.safeParse(body)

    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      throw validationFailed({ reason: errorDetails })
    }
    const input = camelKeys(parsed.data)

    // 1. Fetch order details via Clean OrderRepository (REQ-ARCH-006)
    const orderRepo = getOrderRepository()
    const order = await orderRepo.findById(ctx.organizationId, orderId)

    if (!order) {
      throw notFound()
    }
    // Chỉ gửi tới đối tác ACTIVE của chính chuỗi (và người nhận thuộc đối tác đó); khác → 404
    if (!(await isActivePartnerTarget(ctx.organizationId, input.targetPartnerOrgId, input.targetPartnerUserId))) {
      throw notFound()
    }

    const firstItem = order.items?.[0]
    const meta = (firstItem?.metadata ?? {}) as Record<string, unknown>
    const thumbnailUrl = (meta.masterImageUrl || meta.imageUrl) as string | undefined

    const chatRepo = getInternalChatRepository()
    const useCase = new DispatchOrderToChatUseCase(chatRepo)

    const result = await useCase.execute({
      orderId: order.id,
      orderCode: order.code,
      coordinatorUserId: ctx.userId,
      coordinatorRole: resolved.membership?.role_id ?? "coordinator",
      coordinatorOrgId: ctx.organizationId,
      targetPartnerOrgId: input.targetPartnerOrgId,
      targetPartnerUserId: input.targetPartnerUserId,
      // Không đưa tên người mua sang đối tác (trước đây gán nhầm tên người nhận vào "tên khách")
      recipientName: order.deliveryAddress?.recipientName ?? undefined,
      deliveryTime: order.deliveryWindow?.timeSlot ?? undefined,
      deliveryAddress: formatCardAddress(order.deliveryAddress),
      priceVnd: order.totalVnd,
      thumbnailUrl,
    })

    return jsonResponse({
      data: result,
    })
  },
})
