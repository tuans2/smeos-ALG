import { requireCapability } from "@/core/rbac/capabilities"
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createProductImageSetJob } from "@/modules/product-image-set/use-cases/create-product-image-set-job"
import { IMAGE_SET_BUNDLES } from "@/modules/product-image-set/domain/bundle-catalog"
import { productImageSetBody } from "@/app/api/v1/_contracts/requests-product-extra"

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "I1")

  const idempotencyKey = readIdempotencyKey(request)
  if (!idempotencyKey) {
    throw validationFailed({ "idempotency-key": "Bắt buộc phải có header Idempotency-Key" })
  }

  const body = await request.json().catch(() => null)
  const parsed = productImageSetBody.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const result = await createProductImageSetJob(ctx, {
    assetId: parsed.data.asset_id,
    bundleId: parsed.data.bundle_id,
    customNote: parsed.data.custom_note,
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

export const GET = handle(async () => {
  return jsonResponse({
    bundles: IMAGE_SET_BUNDLES,
  })
})
