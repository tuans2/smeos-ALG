import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { approveChangeRequest } from "@/modules/products/use-cases/product-change-requests"
import { approveChangeRequestBody } from "@/app/api/v1/_contracts/requests-product-extra"

/** `POST /product-change-requests/:id/approve` (`H3`) — áp toàn bộ hoặc chỉ `fields`; bản gốc đã đổi → 409. */
export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "H3")
  const parsed = approveChangeRequestBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { id } = await context.params
  return jsonResponse(await approveChangeRequest(ctx, id, parsed.data?.fields ?? null))
})
