import { jsonResponse } from "@/core/http/response"
import { getProductImageSetResult } from "@/modules/product-image-set/use-cases/get-product-image-set-result"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G1" },
  handler: async ({ ctx, params: routeParams }) => {
    const params = routeParams as { id: string }
    const id = params.id

    const result = await getProductImageSetResult(ctx, id)
    return jsonResponse(result)
  },
})
