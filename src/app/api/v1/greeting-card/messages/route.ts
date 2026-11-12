import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { getThread, sendMessage } from "@/modules/greeting-card/use-cases/internal-messages"
import { messageRef, sendMessageBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/greeting-card/messages?orderId=|sessionId= — toàn bộ trao đổi nội bộ của một đơn. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const parsed = z.object(messageRef).safeParse({
      orderId: url.searchParams.get("orderId") ?? undefined,
      sessionId: url.searchParams.get("sessionId") ?? undefined,
    })
    if (!parsed.success || !!parsed.data.orderId === !!parsed.data.sessionId) throw validationFailed({ messageRef: "Cần orderId hoặc sessionId" })
    return jsonResponse({ data: await getThread(ctx, parsed.data) })
  },
})

/** POST — gửi tin cho một vai / sale phụ trách / một người; `replyToId` trả lời đúng người đã nhắn. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx }) => {
    const parsed = sendMessageBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await sendMessage(ctx, parsed.data) }, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
