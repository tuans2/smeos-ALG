import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { approveVariant } from "@/modules/media/use-cases/approve-variant"
import { approveVariantBody } from "@/app/api/v1/_contracts/requests-media"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /media/variants/:id/approve` (`I5`).
 *
 * `asset_id` bắt buộc, không có mặc định "duyệt hết": một lượt M04b sinh
 * nhiều biến thể và người bán thường chỉ đăng một tấm.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I5" },
  handler: async ({ request, ctx, params }) => {
      const parsed = approveVariantBody.safeParse(await request.json().catch(() => null))
      if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

      const { id } = params as { id: string }
      return jsonResponse(await approveVariant(ctx, id, parsed.data.asset_id))
  },
})
