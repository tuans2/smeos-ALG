import { z } from "zod"
import { handle, jsonResponse } from "@/core/http/response"
import { notFound, validationFailed } from "@/core/http/errors"
import { isAllowedChatTarget } from "@/modules/chain-partnership/infra/partner-link-guard"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { CLIENT_CREATABLE_CONVERSATION_TYPES } from "@/modules/internal-chat/domain/chat-limits"
import { getOrderRepository } from "@/modules/orders/infra/order-repository"
import { ListUserConversationsUseCase } from "@/modules/internal-chat/use-cases/list-user-conversations"
import { CreateOrGetConversationUseCase } from "@/modules/internal-chat/use-cases/create-or-get-conversation"

const createConversationSchema = z.object({
  // `PLATFORM_TENANT` (Nền tảng ↔ khách) không cho client tự tạo
  conversationType: z.enum(CLIENT_CREATABLE_CONVERSATION_TYPES),
  title: z.string().trim().max(200).optional(),
  targetOrganizationId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
})

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  const url = new URL(request.url)
  const typeParsed = z.enum(["PLATFORM_TENANT", "CHAIN_PARTNER", "ORDER_THREAD"]).optional().safeParse(url.searchParams.get("type") || undefined)
  if (!typeParsed.success) throw validationFailed({ type: "Loại cuộc hội thoại không hợp lệ" })
  const conversationType = typeParsed.data
  const orderId = url.searchParams.get("orderId") ?? undefined

  const chatRepo = getInternalChatRepository()
  const useCase = new ListUserConversationsUseCase(chatRepo)

  const result = await useCase.execute({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    conversationType,
    orderId,
  })

  return jsonResponse({
    success: true,
    data: result.items,
    total: result.total,
  })
})

export const POST = handle(async (request) => {
  const { resolved, ctx } = await requireTenantContext(request)
  const body = await request.json().catch(() => null)
  const parsed = createConversationSchema.safeParse(body)

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
})
