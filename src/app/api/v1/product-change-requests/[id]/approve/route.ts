import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { approveChangeRequest } from "@/modules/products/use-cases/product-change-requests"
import { approveChangeRequestBody } from "@/app/api/v1/_contracts/requests-product-extra"
import { defineRoute } from "@/core/http/define-route"

/** `POST /product-change-requests/:id/approve` (`H3`) — áp toàn bộ hoặc chỉ `fields`; bản gốc đã đổi → 409. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ request, ctx, params }) => {
    const parsed = approveChangeRequestBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { id } = params as { id: string }
    return jsonResponse(await approveChangeRequest(ctx, id, parsed.data?.fields ?? null))
  },
})
