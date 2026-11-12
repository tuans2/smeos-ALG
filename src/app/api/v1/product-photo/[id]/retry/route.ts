import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { retryProductPhoto } from "@/modules/product-photo-studio/use-cases/retry-product-photo"
import { productPhotoRetryBody } from "@/app/api/v1/_contracts/requests-product-extra"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx, params: routeParams }) => {
    const params = routeParams as { id: string }
    const id = params.id

    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) {
      throw validationFailed({ "idempotency-key": "Bắt buộc có header Idempotency-Key" })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = productPhotoRetryBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const result = await retryProductPhoto(ctx, {
      jobId: id,
      retryHint: parsed.data.retry_hint,
      idempotencyKey,
    })

    return jsonResponse(
      {
        job_id: result.job.id,
        status: result.job.status,
        usage: {
          cost_credit: result.usage.costCredit,
          balance_after: result.usage.balanceAfter,
        },
      },
      { status: 201 }
    )
  },
})
