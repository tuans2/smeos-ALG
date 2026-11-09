import { z } from "zod"
import { handle, jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { INTERNAL_CHAT_CAPABILITY } from "@/modules/internal-chat/domain/chat-capabilities"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { CHAT_MESSAGE_MAX_LENGTH, CHAT_PAGE_MAX_LIMIT } from "@/modules/internal-chat/domain/chat-limits"
import { decodeMessageCursor, encodeMessageCursor } from "@/modules/internal-chat/domain/message-cursor"
import { GetConversationMessagesUseCase } from "@/modules/internal-chat/use-cases/get-conversation-messages"
import { SendChatMessageUseCase } from "@/modules/internal-chat/use-cases/send-chat-message"
import { subcontractCardDecorator } from "@/modules/internal-chat/infra/subcontract-card-decorator"

/**
 * Client chỉ gửi tin chữ. `.strict()`: thân có `actionPayload` / `attachments` / loại khác `TEXT` → 400 — thẻ đơn
 * và tin hệ thống chỉ do use-case máy chủ sinh (trước đây client tự gửi được `SYSTEM_NOTICE` với payload tuỳ ý).
 */
const sendMessageSchema = z
  .object({
    content: z.string().max(CHAT_MESSAGE_MAX_LENGTH, `Tin nhắn tối đa ${CHAT_MESSAGE_MAX_LENGTH} ký tự`),
    messageType: z.literal("TEXT").optional(),
  })
  .strict()

const listQuerySchema = z.object({
  before: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(CHAT_PAGE_MAX_LIMIT).optional(),
})

function issuesOf(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join(".") || "body"}: ${e.message}`).join(", ")
}

export const GET = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, INTERNAL_CHAT_CAPABILITY.use)
  const { id: conversationId } = await context.params
  const url = new URL(request.url)
  const query = listQuerySchema.safeParse({ before: url.searchParams.get("before") ?? undefined, limit: url.searchParams.get("limit") ?? undefined })
  if (!query.success) throw validationFailed({ reason: issuesOf(query.error) })
  const before = query.data.before ? decodeMessageCursor(query.data.before) : undefined
  if (before === null) throw validationFailed({ before: "Con trỏ trang không hợp lệ" })

  const decorate = subcontractCardDecorator({ canFulfil: hasCapability(ctx, INTERNAL_CHAT_CAPABILITY.fulfilOrder) })
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
    success: true,
    data: page.items,
    nextCursor: page.nextCursor ? encodeMessageCursor(page.nextCursor) : null,
  })
})

export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { resolved, ctx } = await requireTenantContext(request)
  requireCapability(ctx, INTERNAL_CHAT_CAPABILITY.use)
  const { id: conversationId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) throw validationFailed({ reason: issuesOf(parsed.error) })

  const useCase = new SendChatMessageUseCase(getInternalChatRepository(), getChatLinkPolicy())
  const message = await useCase.execute({
    conversationId,
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    branchId: ctx.branchId,
    userRole: resolved.membership?.role_id ?? "member",
    content: parsed.data.content,
  })

  return jsonResponse({
    success: true,
    data: message,
  })
})
