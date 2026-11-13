/** `GET /api/v1/orders/coordination-queue` (R1) — đơn ngoài Thẻ chào đang điều phối (tab Điều phối của Đơn hàng). */

import { jsonResponse } from "@/core/http/response"
import { listCoordinationQueue } from "@/modules/orders/use-cases/list-coordination-queue"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await listCoordinationQueue(ctx))
  },
})

export const dynamic = "force-dynamic"
