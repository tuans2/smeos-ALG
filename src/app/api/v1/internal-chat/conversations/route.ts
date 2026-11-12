import { z } from "zod"
import { jsonResponse } from "@/core/http/response"
import { createInternalConversationBody, openInternalRoomBody } from "@/app/api/v1/_contracts/requests-chat"
import { requireCapability } from "@/core/rbac/capabilities"
import { notFound, validationFailed } from "@/core/http/errors"
import { isAllowedChatTarget } from "@/modules/chain-partnership/infra/partner-link-guard"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { getOrderRepository } from "@/modules/orders/infra/order-repository"
import { ListUserConversationsUseCase } from "@/modules/internal-chat/use-cases/list-user-conversations"
import { CreateOrGetConversationUseCase } from "@/modules/internal-chat/use-cases/create-or-get-conversation"
import { openRoom } from "@/modules/internal-chat/use-cases/open-room"
import { PrismaPartnerOrderStats } from "@/modules/internal-chat/infra/prisma-partner-order-stats"
import { PrismaChatRoomDirectory } from "@/modules/internal-chat/infra/prisma-chat-room-directory"
import { INTERNAL_CHAT_CAPABILITY } from "@/modules/internal-chat/domain/chat-capabilities"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: INTERNAL_CHAT_CAPABILITY.use" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    requireCapability(ctx, INTERNAL_CHAT_CAPABILITY.use)
    const typeParsed = z.enum(["PLATFORM_TENANT", "CHAIN_PARTNER", "CHAIN_BRANCH", "ORDER_THREAD"]).optional().safeParse(url.searchParams.get("type") || undefined)
    if (!typeParsed.success) throw validationFailed({ type: "Loại cuộc hội thoại không hợp lệ" })
    const conversationType = typeParsed.data
    const orderId = url.searchParams.get("orderId") ?? undefined

    const chatRepo = getInternalChatRepository()
    const useCase = new ListUserConversationsUseCase(chatRepo)

    const result = await useCase.execute({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      conversationType,
      orderId,
    })

    // Phía chuỗi: mỗi phòng cửa hàng đối tác kèm số đơn cửa hàng đang giữ (IC-5.5)
    const partnerIds = result.items.filter((c) => c.organizationId === ctx.organizationId && c.counterpartOrgId).map((c) => c.counterpartOrgId!)
    if (partnerIds.length > 0) {
      const active = await new PrismaPartnerOrderStats().activeOrdersByPartner(ctx.organizationId, partnerIds)
      for (const c of result.items) if (c.counterpartOrgId && c.organizationId === ctx.organizationId) c.activeOrderCount = active.get(c.counterpartOrgId) ?? 0
    }

    return jsonResponse({
      success: true,
      data: result.items,
      total: result.total,
    })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: INTERNAL_CHAT_CAPABILITY.use },
  handler: async ({ request, ctx, resolved }) => {
    const body = await request.json().catch(() => null)

    const room = openInternalRoomBody.safeParse(body)
    if (room.success) {
      const chatRepo = getInternalChatRepository()
      const conversation = await openRoom(
        { chatRepo, linkPolicy: getChatLinkPolicy(), directory: new PrismaChatRoomDirectory() },
        { userId: ctx.userId, organizationId: ctx.organizationId, branchId: ctx.branchId },
        room.data
      )
      return jsonResponse({ success: true, data: conversation })
    }

    const parsed = createInternalConversationBody.safeParse(body)

    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      throw validationFailed({ reason: errorDetails })
    }

    // Người được mời phải thuộc tổ chức mình hoặc đối tác/chuỗi đang liên kết; khác → 404
    const { targetUserId, targetOrganizationId } = parsed.data
    if (targetUserId && !(await isAllowedChatTarget(ctx.organizationId, targetOrganizationId ?? ctx.organizationId, targetUserId))) {
      throw notFound()
    }

    // Luồng theo đơn chỉ gắn với đơn của CHÍNH tổ chức — trước đây tổ chức khác gắn được mã đơn của chuỗi vào phòng
    // của mình, rồi lệnh gửi đơn của chuỗi (tra phòng theo mã đơn) đăng thẻ đơn sang phòng đó.
    if (parsed.data.orderId && !(await getOrderRepository().findById(ctx.organizationId, parsed.data.orderId))) {
      throw notFound()
    }

    const chatRepo = getInternalChatRepository()
    const useCase = new CreateOrGetConversationUseCase(chatRepo, getChatLinkPolicy())

    const conversation = await useCase.execute({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      userRole: resolved.membership?.role_id ?? "member",
      conversationType: parsed.data.conversationType,
      title: parsed.data.title,
      targetOrganizationId: parsed.data.targetOrganizationId,
      targetUserId: parsed.data.targetUserId,
      orderId: parsed.data.orderId,
    })

    return jsonResponse({
      success: true,
      data: conversation,
    })
  },
})
