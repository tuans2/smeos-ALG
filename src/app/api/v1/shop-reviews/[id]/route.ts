
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { patchReviewBody } from "@/app/api/v1/_contracts/requests-profile"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { removeReview, updateReview } from "@/modules/shop-reviews/use-cases/manage-shop-reviews"

type Ctx = { params: Promise<{ id: string }> }

/** Đánh giá của tổ chức khác → 404 (không lộ là có tồn tại). */
export const PATCH = handle<[Ctx]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "J1")
  const { id } = await context.params
  const parsed = patchReviewBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const input = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined))
  return jsonResponse({ data: await updateReview(ctx, id, input) })
})

export const DELETE = handle<[Ctx]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "J1")
  const { id } = await context.params
  await removeReview(ctx, id)
  return jsonResponse({ data: { id } })
})
