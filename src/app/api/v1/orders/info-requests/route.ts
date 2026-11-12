/** `GET /api/v1/orders/info-requests` (R1) — việc "Thiếu thông tin": mọi yêu cầu bổ sung còn mở, hạn gần nhất trước (checklist ALG 4.14). */

import { jsonResponse } from "@/core/http/response"
import { listOpenInfoRequests } from "@/modules/orders/use-cases/order-info-requests"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listOpenInfoRequests(ctx) })
  },
})

export const dynamic = "force-dynamic"
