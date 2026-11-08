/** `POST /api/v1/orders/:id/my-work` (R17) — thợ nhận việc (`START`) hoặc báo xong (`FINISH`) việc giao cho mình. */

import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { reportFloristWork } from "@/modules/orders/use-cases/florist-queue"
import { floristWorkBody } from "@/app/api/v1/_contracts/requests-orders"

export const POST = handle(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R17")
  const { id } = await params
  const { action } = floristWorkBody.parse(await request.json())
  return jsonResponse(await reportFloristWork(ctx, id, action))
})
