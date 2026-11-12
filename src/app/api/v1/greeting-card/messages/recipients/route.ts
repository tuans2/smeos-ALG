import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { listRecipients } from "@/modules/greeting-card/use-cases/internal-messages"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/greeting-card/messages/recipients — lựa chọn "Gửi cho" (vai + thành viên). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listRecipients(ctx) })
  },
})
