/**
 * GET /api/v1/products/[id]/master-index
 * Trích xuất Master Index chi tiết cho 1 sản phẩm cụ thể.
 * Quyền: L1 (Xem chi tiết sản phẩm).
 */

import { notFound } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getProductMasterIndex } from "@/modules/products/use-cases/get-product-master-index"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const masterIndex = await getProductMasterIndex(ctx, id)

    if (!masterIndex) {
      throw notFound()
    }

    return jsonResponse({ item: masterIndex })
  },
})
