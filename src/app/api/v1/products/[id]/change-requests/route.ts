import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { listChangeRequests, submitChangeRequest } from "@/modules/products/use-cases/product-change-requests"
import { changeRequestBody } from "@/app/api/v1/_contracts/requests-products"

/** `GET /products/:id/change-requests` (`H3`) — đề xuất sửa đang chờ của một mẫu. */
export const GET = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "H3")
  const { id } = await context.params
  return jsonResponse({ data: await listChangeRequests(ctx, { productId: id, status: "PENDING" }) })
})

/** `POST /products/:id/change-requests` (`L3`) — nhân viên đề xuất sửa mẫu chính thức; bản gốc giữ nguyên. */
export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L3")

  const parsed = changeRequestBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { image_asset_id, ...rest } = parsed.data

  const { id } = await context.params
  const created = await submitChangeRequest(ctx, id, { ...rest, ...(image_asset_id !== undefined ? { imageAssetId: image_asset_id } : {}) })
  return jsonResponse(created, { status: 201 })
})
