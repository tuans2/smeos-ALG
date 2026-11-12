import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { decideDiscount } from "@/modules/greeting-card/use-cases/discount-requests"
import { discountDecisionBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/** POST /api/v1/greeting-card/discount-requests/[id]/decision — Điều hành duyệt/từ chối (F2). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = discountDecisionBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)
    const { approve, note, percent, amountVnd } = input
    const ask = percent !== undefined || amountVnd !== undefined ? { percent, amountVnd } : undefined
    return jsonResponse({ data: await decideDiscount(ctx, { requestId: id, approve, ask, note }) })
  },
})
