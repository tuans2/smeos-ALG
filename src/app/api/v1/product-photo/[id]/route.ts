import { jsonResponse } from "@/core/http/response"
import { getProductPhotoResult } from "@/modules/product-photo-studio/use-cases/get-product-photo-result"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G1" },
  handler: async ({ ctx, params: routeParams }) => {
    const params = routeParams as { id: string }
    const id = params.id

    const result = await getProductPhotoResult(ctx, id)
    return jsonResponse(result)
  },
})
