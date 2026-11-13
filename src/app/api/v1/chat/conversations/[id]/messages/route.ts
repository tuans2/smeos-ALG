/**
 * GET|POST /api/v1/chat/conversations/[id]/messages
 * T1: Xem tin nhắn trong cuộc hội thoại
 * T2: Gửi tin nhắn và nhận phản hồi AI tư vấn hoa
 */

import { jsonResponse } from "@/core/http/response"
import { getConversationMessages } from "@/modules/chat-assistant/use-cases/get-conversation-messages"
import { sendChatMessage } from "@/modules/chat-assistant/use-cases/send-chat-message"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "T1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const messages = await getConversationMessages(ctx, id)
    return jsonResponse({ messages })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "T2" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json()
    const result = await sendChatMessage(
      ctx,
      id,
      body.query || body.content || "",
      body.assistantType
    )
    return jsonResponse(result)
  },
})
