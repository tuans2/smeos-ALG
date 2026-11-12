
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { createReviewBody } from "@/app/api/v1/_contracts/requests-profile"
import { createReview, listReviews } from "@/modules/shop-reviews/use-cases/manage-shop-reviews"
import { defineRoute } from "@/core/http/define-route"

/** Đánh giá khách do chủ tiệm nhập — hiện trên trang khách Landing/Catalog (`J1`). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listReviews(ctx) })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ request, ctx }) => {
    const parsed = createReviewBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await createReview(ctx, parsed.data) }, { status: 201 })
  },
})
