import { muteInternalConversationBody } from "@/app/api/v1/_contracts/requests-chat"
import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { setConversationMuted } from "@/modules/internal-chat/use-cases/set-conversation-muted"

/** PATCH /api/v1/internal-chat/conversations/:id/mute (S1) — `{ muted }`: tắt / bật thông báo tin nhắn của phòng cho chính mình. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "S1" },
  body: muteInternalConversationBody,
  handler: async ({ ctx, params, body }) =>
    ok(
      await setConversationMuted(
        { chatRepo: getInternalChatRepository(), linkPolicy: getChatLinkPolicy() },
        { conversationId: params.id ?? "", caller: { userId: ctx.userId, organizationId: ctx.organizationId, branchId: ctx.branchId }, muted: body.muted }
      )
    ),
})
