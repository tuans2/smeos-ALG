import { z } from "zod"
import { jsonResponse } from "@/core/http/response"
import { sendInternalMessageBody } from "@/app/api/v1/_contracts/requests-chat"
import { hasCapability } from "@/core/rbac/capabilities"
import { INTERNAL_CHAT_CAPABILITY } from "@/modules/internal-chat/domain/chat-capabilities"
import { validationFailed } from "@/core/http/errors"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { CHAT_PAGE_MAX_LIMIT } from "@/modules/internal-chat/domain/chat-limits"
import { decodeMessageCursor, encodeMessageCursor } from "@/modules/internal-chat/domain/message-cursor"
import { composeDecorators, GetConversationMessagesUseCase } from "@/modules/internal-chat/use-cases/get-conversation-messages"
import { chatImageDecorator } from "@/modules/internal-chat/infra/chat-image-decorator"
import { changeableDecorator } from "@/modules/internal-chat/use-cases/change-chat-message"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { SendChatMessageUseCase } from "@/modules/internal-chat/use-cases/send-chat-message"
import { subcontractCardDecorator } from "@/modules/internal-chat/infra/subcontract-card-decorator"
import { createChatNotifier } from "@/modules/internal-chat/infra/chat-notifier"
import { defineRoute } from "@/core/http/define-route"

const listQuerySchema = z.object({
  before: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(CHAT_PAGE_MAX_LIMIT).optional(),
})

function issuesOf(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join(".") || "body"}: ${e.message}`).join(", ")
}

export const GET = defineRoute({
  auth: { kind: "tenant", capability: INTERNAL_CHAT_CAPABILITY.use },
  handler: async ({ request, ctx, params }) => {
    const { id: conversationId } = params as { id: string }
    const url = new URL(request.url)
    const query = listQuerySchema.safeParse({ before: url.searchParams.get("before") ?? undefined, limit: url.searchParams.get("limit") ?? undefined })
    if (!query.success) throw validationFailed({ reason: issuesOf(query.error) })
    const before = query.data.before ? decodeMessageCursor(query.data.before) : undefined
    if (before === null) throw validationFailed({ before: "Con trỏ trang không hợp lệ" })

    const decorate = composeDecorators(
      subcontractCardDecorator({ canFulfil: hasCapability(ctx, INTERNAL_CHAT_CAPABILITY.fulfilOrder) }),
      chatImageDecorator(getStorageProvider()),
      changeableDecorator()
    )
    const useCase = new GetConversationMessagesUseCase(getInternalChatRepository(), getChatLinkPolicy(), decorate)
    const page = await useCase.execute({
      conversationId,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      limit: query.data.limit,
      before,
    })

    return jsonResponse({
      data: page.items,
      next_cursor: page.nextCursor ? encodeMessageCursor(page.nextCursor) : null,
    })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: INTERNAL_CHAT_CAPABILITY.use },
  handler: async ({ request, ctx, resolved, params }) => {
    const { id: conversationId } = params as { id: string }
    const body = await request.json().catch(() => null)
    const parsed = sendInternalMessageBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ reason: issuesOf(parsed.error) })

    const chatRepo = getInternalChatRepository()
    const useCase = new SendChatMessageUseCase(chatRepo, getChatLinkPolicy(), createChatNotifier(chatRepo))
    const message = await useCase.execute({
      conversationId,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      userRole: resolved.membership?.role_id ?? "member",
      content: parsed.data.content,
    })

    return jsonResponse({
      data: message,
    })
  },
})
