import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { rejectProductProposal } from "@/modules/products/use-cases/review-product-proposal"
import { rejectProductBody } from "@/app/api/v1/_contracts/requests-products"
import { defineRoute } from "@/core/http/define-route"

/** `POST /products/:id/reject` (`H3`, trần cứng `dieu_hanh`) — từ chối mẫu đề xuất, bắt buộc kèm lý do. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ request, ctx, params }) => {
    const parsed = rejectProductBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const { id } = params as { id: string }
    return jsonResponse(await rejectProductProposal(ctx, id, parsed.data.reason))
  },
})
