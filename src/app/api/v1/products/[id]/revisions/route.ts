import { jsonResponse } from "@/core/http/response"
import { listProductRevisions } from "@/modules/products/use-cases/product-revisions"
import { defineRoute } from "@/core/http/define-route"

/** `GET /products/:id/revisions` (`H3`) — các phiên bản đã lưu của mẫu, mới nhất trước. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await listProductRevisions(ctx, id) })
  },
})
