import { jsonResponse } from "@/core/http/response"
import { getOrderPrintout } from "@/modules/orders/use-cases/get-order-printout"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/orders/:id/print` (R7) — Phiếu in đơn và phiếu sản xuất */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R7" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }

    const printData = await getOrderPrintout(ctx, id)
    return jsonResponse({ print: printData })
  },
})
