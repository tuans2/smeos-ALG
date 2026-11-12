import { jsonResponse } from "@/core/http/response"
import { approveProductProposal } from "@/modules/products/use-cases/review-product-proposal"
import { defineRoute } from "@/core/http/define-route"

/** `POST /products/:id/approve` (`H3`, trần cứng `dieu_hanh`) — duyệt mẫu do nhân viên đề xuất. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await approveProductProposal(ctx, id))
  },
})
