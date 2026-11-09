import { notFound } from "@/core/http/errors"
import { noContent } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { isSocialChannel } from "@/modules/social-publishing/domain/post-lifecycle"
import { disconnect } from "@/modules/social-publishing/use-cases/connect-channel"

/** POST /api/v1/social-publishing/channels/[channel]/disconnect (W2) — ngắt kết nối kênh đăng bài, xoá khoá. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "W2" },
  handler: async ({ ctx, params }) => {
    const channel = params.channel ?? ""
    if (!isSocialChannel(channel)) throw notFound()
    await disconnect(ctx, channel)
    return noContent()
  },
})
