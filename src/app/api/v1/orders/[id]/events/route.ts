import { jsonResponse } from "@/core/http/response"
import { getOrder } from "@/modules/orders/use-cases/get-order"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/orders/:id/events` (R1) — Nhật ký đổi trạng thái, nguồn đo SLA */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }

    const { order, sla } = await getOrder(ctx, id)
    return jsonResponse({
      events: order.events ?? [],
      sla,
    })
  },
})
