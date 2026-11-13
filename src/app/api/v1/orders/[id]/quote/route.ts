/** `POST /api/v1/orders/:id/quote` (R15) — Sale báo giá đơn ngoài Thẻ chào. Body `{ totalVnd, note? }`. */

import { jsonResponse } from "@/core/http/response"
import { quoteOrder } from "@/modules/orders/use-cases/quote-order"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R15" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    return jsonResponse(await quoteOrder(ctx, id, { totalVnd: body.totalVnd, note: body.note }))
  },
})
