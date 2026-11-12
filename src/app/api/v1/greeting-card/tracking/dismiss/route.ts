import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { proposeDismissal } from "@/modules/greeting-card/use-cases/propose-dismissal"
import { dismissBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/**
 * POST /api/v1/greeting-card/tracking/dismiss
 * Sale/Điều phối (R1) đề xuất; người có R6 (Điều hành) bỏ hiển thị trực tiếp đơn/link chưa thanh toán.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ request: req, ctx }) => {
    const body = await req.json().catch(() => null)
    const parsed = dismissBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)

    const result = await proposeDismissal(ctx, input)
    return jsonResponse({ data: result }, { status: 200 })
  },
})
