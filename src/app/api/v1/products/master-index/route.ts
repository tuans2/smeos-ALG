/**
 * GET /api/v1/products/master-index
 * Lấy danh sách sản phẩm kèm Master Index đầy đủ (BOM hoa, ảnh mẫu, giá, tone màu).
 * Quyền: L1 (Xem sản phẩm).
 */

import { jsonResponse } from "@/core/http/response"
import { listProductMasterIndex } from "@/modules/products/use-cases/get-product-master-index"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam ? Number(limitParam) : 50

    const items = await listProductMasterIndex(ctx, Number.isNaN(limit) ? 50 : limit)
    return jsonResponse({ items, count: items.length })
  },
})
