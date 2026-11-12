import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getOrder } from "@/modules/orders/use-cases/get-order"
import { editOrder } from "@/modules/orders/use-cases/edit-order"
import { syncOrderInfoRequests } from "@/modules/orders/use-cases/order-info-requests"
import { patchOrderBody } from "@/app/api/v1/_contracts/requests-orders"

/** `GET /api/v1/orders/:id` (R1) — Xem chi tiết đơn hàng & SLA */
export const GET = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R1")

  const { id } = await context.params
  const result = await getOrder(ctx, id)
  return jsonResponse(result)
})

/** `PATCH /api/v1/orders/:id` (R3) — Sửa đơn và cập nhật tiến độ sản xuất */
export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R3")

  const { id } = await context.params
  const body = await request.json()
  const parsed = patchOrderBody.parse(body)

  const updated = await editOrder(ctx, id, parsed)
  // Bổ sung đủ thông tin → yêu cầu bổ sung tự đóng (checklist ALG 4.14)
  await syncOrderInfoRequests(ctx, id)
  return jsonResponse({ order: updated })
})
