/** `POST /api/v1/orders/:id/my-work` (R17) — thợ nhận việc (`START`) hoặc báo xong (`FINISH`) việc giao cho mình. */

import { jsonResponse } from "@/core/http/response"
import { reportFloristWork } from "@/modules/orders/use-cases/florist-queue"
import { floristWorkBody } from "@/app/api/v1/_contracts/requests-orders"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R17" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const { action } = floristWorkBody.parse(await request.json())
    return jsonResponse(await reportFloristWork(ctx, id, action))
  },
})
