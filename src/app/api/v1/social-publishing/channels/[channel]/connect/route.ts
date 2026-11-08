import { notFound } from "@/core/http/errors"
import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { isSocialChannel } from "@/modules/social-publishing/domain/post-lifecycle"
import { startConnect } from "@/modules/social-publishing/use-cases/connect-channel"

/** POST /api/v1/social-publishing/channels/[channel]/connect (W2) — link trang đồng ý của nền tảng (OAuth). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "W2" },
  rateLimit: { scope: "social-channel-connect", limit: 20, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, params }) => {
    const channel = params.channel ?? ""
    if (!isSocialChannel(channel)) throw notFound()
    return ok(await startConnect(ctx, channel))
  },
})
