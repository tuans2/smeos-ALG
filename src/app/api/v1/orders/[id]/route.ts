import { jsonResponse } from "@/core/http/response"
import { getOrder } from "@/modules/orders/use-cases/get-order"
import { updateOrderProgress } from "@/modules/orders/use-cases/update-order-progress"
import { syncOrderInfoRequests } from "@/modules/orders/use-cases/order-info-requests"
import { patchOrderBody } from "@/app/api/v1/_contracts/requests-orders"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/orders/:id` (R1) — Xem chi tiết đơn hàng & SLA */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const result = await getOrder(ctx, id)
    return jsonResponse(result)
  },
})

/** `PATCH /api/v1/orders/:id` (R3) — Sửa đơn và cập nhật tiến độ sản xuất */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json()
    const parsed = patchOrderBody.parse(body)

    const updated = await updateOrderProgress(ctx, id, parsed)
    // Bổ sung đủ thông tin → yêu cầu bổ sung tự đóng (checklist ALG 4.14)
    await syncOrderInfoRequests(ctx, id)
    return jsonResponse({ order: updated })
  },
})
