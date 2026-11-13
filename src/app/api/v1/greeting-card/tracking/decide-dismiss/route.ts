import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { DISMISSAL_DECIDE_CAPABILITY } from "@/modules/greeting-card/domain/dismissal-policy"
import { decideDismissal } from "@/modules/greeting-card/use-cases/decide-dismissal"
import { decideDismissBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/greeting-card/tracking/decide-dismiss
 * Điều hành (R6) phê duyệt hoặc từ chối đề xuất bỏ hiển thị.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: DISMISSAL_DECIDE_CAPABILITY },
  handler: async ({ request: req, ctx }) => {
    const body = await req.json().catch(() => null)
    const parsed = decideDismissBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await decideDismissal(ctx, {
      id: parsed.data.id,
      type: parsed.data.type,
      approve: parsed.data.approve,
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    })
    return jsonResponse({ data: result }, { status: 200 })
  },
})
