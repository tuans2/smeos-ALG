import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { assignFlorist } from "@/modules/orders/use-cases/assign-florist"
import { assignOrderBody } from "@/app/api/v1/_contracts/requests-orders"

/** `POST /api/v1/orders/:id/assign` (R4) — Phân công thợ chế tác */
export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R4")

  const { id } = await context.params
  const body = await request.json()
  const parsed = assignOrderBody.parse(body)

  const updated = await assignFlorist(ctx, id, parsed)
  return jsonResponse({ order: updated })
})
