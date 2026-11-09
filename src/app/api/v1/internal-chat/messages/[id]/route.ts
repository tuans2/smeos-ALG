import { z } from "zod"
import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { CHAT_MESSAGE_MAX_LENGTH } from "@/modules/internal-chat/domain/chat-limits"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { deleteChatMessage, editChatMessage } from "@/modules/internal-chat/use-cases/change-chat-message"

const deps = () => ({ chatRepo: getInternalChatRepository(), linkPolicy: getChatLinkPolicy() })

/**
 * PATCH /api/v1/internal-chat/messages/:id (S1) — người gửi sửa tin chữ / chú thích ảnh của mình trong 24 giờ.
 * Tin của người khác / ngoài phòng → 404; quá hạn, đã thu hồi, thẻ đơn, tin hệ thống → 409.
 * Nhật ký kiểm toán chỉ ghi loại tin và độ dài, không ghi nội dung.
 */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "S1" },
  rateLimit: { scope: "internal-chat-message-change", limit: 30, windowMs: 60_000, per: "user" },
  body: z.object({ content: z.string().max(CHAT_MESSAGE_MAX_LENGTH, `Tin nhắn tối đa ${CHAT_MESSAGE_MAX_LENGTH} ký tự`) }).strict(),
  handler: async ({ ctx, params, body }) => {
    const message = await editChatMessage(deps(), {
      messageId: params.id ?? "",
      caller: { userId: ctx.userId, organizationId: ctx.organizationId, branchId: ctx.branchId },
      content: body.content,
    })
    await recordAuditLog(ctx, { action: "internal_chat.message.edit", entityType: "internal_chat_messages", entityId: message.id, after: { messageType: message.messageType, length: message.content.length } })
    return ok(message)
  },
})

/** DELETE /api/v1/internal-chat/messages/:id (S1) — người gửi thu hồi tin của mình trong 24 giờ; ảnh vào hàng đợi xoá tệp. */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "S1" },
  rateLimit: { scope: "internal-chat-message-change", limit: 30, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, params }) => {
    const messageId = params.id ?? ""
    const result = await deleteChatMessage(deps(), { messageId, caller: { userId: ctx.userId, organizationId: ctx.organizationId, branchId: ctx.branchId } })
    await recordAuditLog(ctx, { action: "internal_chat.message.delete", entityType: "internal_chat_messages", entityId: messageId, before: result })
    return ok({ id: messageId, deleted: true })
  },
})
