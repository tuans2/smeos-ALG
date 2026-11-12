/** `POST /api/v1/orders/:id/info-requests/:requestId` (R3) — đóng yêu cầu: đã nhận (`RECEIVED`) hoặc huỷ (`CANCELLED`, có lý do). */

import { jsonResponse } from "@/core/http/response"
import { closeOrderInfoRequest } from "@/modules/orders/use-cases/order-info-requests"
import { closeInfoRequestBody } from "@/app/api/v1/_contracts/requests-orders"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id, requestId } = params as { id: string; requestId: string }
    await closeOrderInfoRequest(ctx, id, requestId, closeInfoRequestBody.parse(await request.json()))
    return jsonResponse({ ok: true })
  },
})
