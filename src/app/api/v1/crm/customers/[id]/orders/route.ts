/** `GET /api/v1/crm/customers/:id/orders` (Q1 + R1) — đơn đã đặt của khách, mọi nguồn (checklist ALG 4.11). */

import { jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { listCustomerOrders } from "@/modules/orders/use-cases/list-customer-orders"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  handler: async ({ ctx, params }) => {
    requireCapability(ctx, "R1")
    const { id } = params as { id: string }
    return jsonResponse({ data: await listCustomerOrders(ctx, id) })
  },
})

export const dynamic = "force-dynamic"
