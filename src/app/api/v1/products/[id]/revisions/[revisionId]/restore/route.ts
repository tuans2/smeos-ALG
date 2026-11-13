import { jsonResponse } from "@/core/http/response"
import { restoreProductRevision } from "@/modules/products/use-cases/product-revisions"
import { defineRoute } from "@/core/http/define-route"

/** `POST /products/:id/revisions/:revisionId/restore` (`H3`) — khôi phục nội dung mẫu về một phiên bản. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ ctx, params }) => {
    const { id, revisionId } = params as { id: string; revisionId: string }
    return jsonResponse(await restoreProductRevision(ctx, id, revisionId))
  },
})
