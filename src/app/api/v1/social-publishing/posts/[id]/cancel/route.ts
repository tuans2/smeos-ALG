import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { cancelPost } from "@/modules/social-publishing/use-cases/manage-posts"

/** POST /api/v1/social-publishing/posts/[id]/cancel (J5) — huỷ bài đang chờ đăng. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J5" },
  handler: async ({ ctx, params }) => ok(await cancelPost(ctx, params.id ?? "")),
})
