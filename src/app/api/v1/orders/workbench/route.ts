/** `GET /api/v1/orders/workbench` (R1) — đơn ngoài Thẻ chào cần Sale/Điều hành xử lý (mục Đơn hàng theo vai). */

import { jsonResponse } from "@/core/http/response"
import { listWorkbench } from "@/modules/orders/use-cases/list-workbench"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await listWorkbench(ctx))
  },
})

export const dynamic = "force-dynamic"
