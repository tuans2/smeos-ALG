import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { listChannelStatuses } from "@/modules/social-publishing/use-cases/manage-posts"

/** GET /api/v1/social-publishing/channels (J5) — trạng thái kết nối Facebook, Instagram, Zalo, TikTok của tổ chức. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "J5" },
  handler: async ({ ctx }) => ok(await listChannelStatuses(ctx)),
})
