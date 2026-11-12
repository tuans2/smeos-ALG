import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listChangeRequests, submitChangeRequest } from "@/modules/products/use-cases/product-change-requests"
import { changeRequestBody } from "@/app/api/v1/_contracts/requests-products"
import { defineRoute } from "@/core/http/define-route"

/** `GET /products/:id/change-requests` (`H3`) — đề xuất sửa đang chờ của một mẫu. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await listChangeRequests(ctx, { productId: id, status: "PENDING" }) })
  },
})

/** `POST /products/:id/change-requests` (`L3`) — nhân viên đề xuất sửa mẫu chính thức; bản gốc giữ nguyên. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ request, ctx, params }) => {
    const parsed = changeRequestBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { image_asset_id, ...rest } = parsed.data

    const { id } = params as { id: string }
    const created = await submitChangeRequest(ctx, id, { ...rest, ...(image_asset_id !== undefined ? { imageAssetId: image_asset_id } : {}) })
    return jsonResponse(created, { status: 201 })
  },
})
