import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { rejectChangeRequest } from "@/modules/products/use-cases/product-change-requests"
import { rejectChangeRequestBody } from "@/app/api/v1/_contracts/requests-product-extra"
import { defineRoute } from "@/core/http/define-route"

/** `POST /product-change-requests/:id/reject` (`H3`) — từ chối đề xuất sửa, bắt buộc lý do. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ request, ctx, params }) => {
    const parsed = rejectChangeRequestBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { id } = params as { id: string }
    return jsonResponse(await rejectChangeRequest(ctx, id, parsed.data.reason))
  },
})
