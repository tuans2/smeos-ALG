import { handle, jsonResponse } from "@/core/http/response"
import { createInternalConversationBody } from "@/app/api/v1/_contracts/requests-chat"
import { notFound, validationFailed } from "@/core/http/errors"
import { isAllowedChatTarget } from "@/modules/chain-partnership/infra/partner-link-guard"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { ListUserConversationsUseCase } from "@/modules/internal-chat/use-cases/list-user-conversations"
import { CreateOrGetConversationUseCase } from "@/modules/internal-chat/use-cases/create-or-get-conversation"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  const url = new URL(request.url)
  const conversationType = url.searchParams.get("type") as never
  const orderId = url.searchParams.get("orderId") ?? undefined

  const chatRepo = getInternalChatRepository()
  const useCase = new ListUserConversationsUseCase(chatRepo)

  const result = await useCase.execute({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    conversationType: conversationType || undefined,
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

  const chatRepo = getInternalChatRepository()
  const useCase = new CreateOrGetConversationUseCase(chatRepo)

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
