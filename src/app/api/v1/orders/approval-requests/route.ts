/** `GET /api/v1/orders/approval-requests?status=&limit=` (R1) — yêu cầu duyệt theo đơn (giao trước, thu sau). */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listApprovalRequests } from "@/modules/orders/use-cases/deliver-before-pay"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw validationFailed({ limit: "Phải là số nguyên từ 1 đến 100" })
    return jsonResponse(await listApprovalRequests(ctx, { status: url.searchParams.get("status") ?? undefined, limit }))
  },
})

export const dynamic = "force-dynamic"
