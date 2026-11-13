import { jsonResponse } from "@/core/http/response"
import { getCoordinatorOrder } from "@/modules/coordinator/use-cases/get-coordinator-order"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `GET /api/v1/coordinator/orders/:id` (R1) — chi tiết đơn điều phối (F04). Tổ chức khác → 404. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ order: await getCoordinatorOrder(ctx, id) })
  },
})
