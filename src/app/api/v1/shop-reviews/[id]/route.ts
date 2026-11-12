
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { patchReviewBody } from "@/app/api/v1/_contracts/requests-profile"
import { removeReview, updateReview } from "@/modules/shop-reviews/use-cases/manage-shop-reviews"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

/** Đánh giá của tổ chức khác → 404 (không lộ là có tồn tại). */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = patchReviewBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined))
    return jsonResponse({ data: await updateReview(ctx, id, input) })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await removeReview(ctx, id)
    return jsonResponse({ data: { id } })
  },
})
