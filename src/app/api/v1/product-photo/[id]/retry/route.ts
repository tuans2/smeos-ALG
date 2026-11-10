import { requireCapability } from "@/core/rbac/capabilities"
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { retryProductPhoto } from "@/modules/product-photo-studio/use-cases/retry-product-photo"
import { productPhotoRetryBody } from "@/app/api/v1/_contracts/requests-product-extra"

export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "I1")
  const params = await context.params
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
})
