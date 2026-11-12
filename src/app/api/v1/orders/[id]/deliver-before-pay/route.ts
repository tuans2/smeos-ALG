/**
 * `POST /api/v1/orders/:id/deliver-before-pay` (R2) — Sale xin "giao trước, thu sau" cho đơn ngoài Thẻ chào.
 * Body `{ reason }`. Trong chính sách / hoả tốc / hạn mức → tự duyệt, đơn sang Điều phối; ngoài → chờ Điều hành.
 */

import { jsonResponse } from "@/core/http/response"
import { requestDeliverBeforePay } from "@/modules/orders/use-cases/deliver-before-pay"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R2" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    const result = await requestDeliverBeforePay(ctx, id, { reason: typeof body.reason === "string" ? body.reason : undefined })
    return jsonResponse(result, { status: 201 })
  },
})
