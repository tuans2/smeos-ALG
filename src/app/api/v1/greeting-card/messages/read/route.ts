import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { markMessagesRead } from "@/modules/greeting-card/use-cases/internal-messages"
import { messagesReadBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/** POST /api/v1/greeting-card/messages/read — đánh dấu đã đọc (đồng bộ mọi thiết bị). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ request, ctx }) => {
    const parsed = messagesReadBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)
    return jsonResponse({ data: await markMessagesRead(ctx, input.messageIds) })
  },
})
