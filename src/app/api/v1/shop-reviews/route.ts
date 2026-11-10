
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { createReviewBody } from "@/app/api/v1/_contracts/requests-profile"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createReview, listReviews } from "@/modules/shop-reviews/use-cases/manage-shop-reviews"

/** Đánh giá khách do chủ tiệm nhập — hiện trên trang khách Landing/Catalog (`J1`). */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "J1")
  return jsonResponse({ data: await listReviews(ctx) })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "J1")
  const parsed = createReviewBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await createReview(ctx, parsed.data) }, { status: 201 })
})
