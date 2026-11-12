import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { createProductPhotoJob } from "@/modules/product-photo-studio/use-cases/create-product-photo-job"
import { BACKGROUND_PRESETS, ASPECT_RATIO_OPTIONS } from "@/modules/product-photo-studio/domain/preset-catalog"
import { productPhotoBody } from "@/app/api/v1/_contracts/requests-product-extra"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) {
      throw validationFailed({ "idempotency-key": "Bắt buộc phải có header Idempotency-Key" })
    }

    const body = await request.json().catch(() => null)
    const parsed = productPhotoBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const result = await createProductPhotoJob(ctx, {
      assetId: parsed.data.asset_id,
      presetId: parsed.data.preset_id,
      aspectRatio: parsed.data.aspect_ratio,
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
  },
})

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "danh mục preset tĩnh cho màn tạo ảnh — chỉ cần đăng nhập (PO 12/11/2026)" },
  handler: async () => {
    return jsonResponse({
      presets: BACKGROUND_PRESETS,
      aspect_ratios: ASPECT_RATIO_OPTIONS,
    })
  },
})
