/** `POST /api/v1/orders/:id/info-requests/:requestId` (R3) — đóng yêu cầu: đã nhận (`RECEIVED`) hoặc huỷ (`CANCELLED`, có lý do). */

import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { closeOrderInfoRequest } from "@/modules/orders/use-cases/order-info-requests"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { closeInfoRequestBody } from "@/app/api/v1/_contracts/requests-orders"

export const POST = handle(async (request, context: { params: Promise<{ id: string; requestId: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R3")
  const { id, requestId } = await context.params
  await closeOrderInfoRequest(ctx, id, requestId, closeInfoRequestBody.parse(await request.json()))
  return jsonResponse({ ok: true })
})
