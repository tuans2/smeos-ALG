/** `GET /api/v1/delivery/my-runs` (R18) — đơn đang giao gắn số điện thoại của shipper đăng nhập. */

import { jsonResponse } from "@/core/http/response"
import { listShipperRuns } from "@/modules/coordinator/use-cases/shipper-runs"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R18" },
  handler: async ({ ctx }) => {
    return jsonResponse(await listShipperRuns(ctx))
  },
})

export const dynamic = "force-dynamic"
