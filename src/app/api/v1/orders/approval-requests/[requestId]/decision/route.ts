/**
 * `POST /api/v1/orders/approval-requests/:requestId/decision` (R16 — trần cứng Điều hành).
 * Body `{ approve: boolean, note?, collectDueAt? }` — từ chối bắt buộc ghi lý do.
 */

import { jsonResponse } from "@/core/http/response"
import { decideDeliverBeforePay } from "@/modules/orders/use-cases/deliver-before-pay"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R16" },
  handler: async ({ request, ctx, params }) => {
    const { requestId } = params as { requestId: string }
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    return jsonResponse(await decideDeliverBeforePay(ctx, requestId, { approve: body.approve, note: body.note, collectDueAt: body.collectDueAt }))
  },
})
