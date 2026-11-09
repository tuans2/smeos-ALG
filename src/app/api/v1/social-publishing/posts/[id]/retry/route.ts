import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { retryPost } from "@/modules/social-publishing/use-cases/manage-posts"

/** POST /api/v1/social-publishing/posts/[id]/retry (J5) — thử lại bài đã dừng vì lỗi. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J5" },
  rateLimit: { scope: "social-posts-retry", limit: 30, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, params }) => ok(await retryPost(ctx, params.id ?? "")),
})
