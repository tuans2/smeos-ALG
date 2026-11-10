import { handle, jsonResponse } from "@/core/http/response"
import { sendInternalMessageBody } from "@/app/api/v1/_contracts/requests-chat"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { GetConversationMessagesUseCase } from "@/modules/internal-chat/use-cases/get-conversation-messages"
import { SendChatMessageUseCase } from "@/modules/internal-chat/use-cases/send-chat-message"

export const GET = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  const { id: conversationId } = await context.params

  const chatRepo = getInternalChatRepository()
  const useCase = new GetConversationMessagesUseCase(chatRepo)

  const messages = await useCase.execute({
    conversationId,
    userId: ctx.userId,
  })

  return jsonResponse({
    success: true,
    data: messages,
  })
})

export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { resolved, ctx } = await requireTenantContext(request)
  const { id: conversationId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = sendInternalMessageBody.safeParse(body)

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
    throw validationFailed({ reason: errorDetails })
  }

  const chatRepo = getInternalChatRepository()
  const useCase = new SendChatMessageUseCase(chatRepo)

  const message = await useCase.execute({
    conversationId,
    userId: ctx.userId,
    userRole: resolved.membership?.role_id ?? "member",
    content: parsed.data.content,
    messageType: parsed.data.messageType,
    attachments: parsed.data.attachments,
    actionPayload: parsed.data.actionPayload,
  })

  return jsonResponse({
    success: true,
    data: message,
  })
})
