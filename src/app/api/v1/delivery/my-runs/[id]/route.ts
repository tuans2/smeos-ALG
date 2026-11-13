/** `POST /api/v1/delivery/my-runs/:id` (R18) — shipper báo đã lấy hàng, đang giao, giao xong (kèm ảnh) hoặc thất bại. */

import { jsonResponse } from "@/core/http/response"
import { reportShipperRun } from "@/modules/coordinator/use-cases/shipper-runs"
import { shipperRunEventBody } from "@/app/api/v1/_contracts/requests-marketing"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R18" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await reportShipperRun(ctx, id, camelKeys(shipperRunEventBody.parse(await request.json()))))
  },
})
