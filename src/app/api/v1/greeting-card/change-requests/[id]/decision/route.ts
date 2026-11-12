import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { decideOrderChange } from "@/modules/greeting-card/use-cases/order-change"
import { changeDecisionBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/greeting-card/change-requests/[id]/decision — duyệt/từ chối yêu cầu đổi
 * thông tin đơn của khách (R3 order.update). Duyệt thì đơn cập nhật ngay, lưu lịch sử.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderUpdate },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = changeDecisionBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await decideOrderChange(ctx, { requestId: id, ...parsed.data }) })
  },
})
