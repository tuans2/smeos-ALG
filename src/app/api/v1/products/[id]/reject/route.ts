import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { rejectProductProposal } from "@/modules/products/use-cases/review-product-proposal"
import { rejectProductBody } from "@/app/api/v1/_contracts/requests-products"

/** `POST /products/:id/reject` (`H3`, trần cứng `dieu_hanh`) — từ chối mẫu đề xuất, bắt buộc kèm lý do. */
export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "H3")

  const parsed = rejectProductBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const { id } = await context.params
  return jsonResponse(await rejectProductProposal(ctx, id, parsed.data.reason))
})
