import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { markSendLinkCopied } from "@/modules/greeting-card/use-cases/share-links"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/greeting-card/send-links/[mã gửi]/copied — ghi mốc sao chép đầu tiên của link riêng. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await markSendLinkCopied(ctx, decodeURIComponent(id)) })
  },
})
