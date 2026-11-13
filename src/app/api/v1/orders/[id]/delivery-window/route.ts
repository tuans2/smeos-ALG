import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { changeDeliveryWindow } from "@/modules/orders/use-cases/change-delivery-window"
import { deliveryWindowChangeBody } from "@/app/api/v1/_contracts/requests-orders"

/** `PATCH /api/v1/orders/:id/delivery-window` (`R21`) — đổi giờ giao kèm lý do; người không có `R3` chỉ đổi đơn mình tạo. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "R21" },
  body: deliveryWindowChangeBody,
  handler: async ({ ctx, params, body }) =>
    jsonResponse({
      order: await changeDeliveryWindow(ctx, params.id ?? "", {
        window: { date: body.date, ...(body.time_slot ? { timeSlot: body.time_slot } : {}) },
        reason: body.reason,
      }),
    }),
})
