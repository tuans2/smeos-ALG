/** `POST /api/v1/delivery/my-runs/:id` (R18) — shipper báo đã lấy hàng, đang giao, giao xong (kèm ảnh) hoặc thất bại. */

import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { reportShipperRun } from "@/modules/coordinator/use-cases/shipper-runs"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { shipperRunEventBody } from "@/app/api/v1/_contracts/requests-marketing"

export const POST = handle(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R18")
  const { id } = await params
  return jsonResponse(await reportShipperRun(ctx, id, shipperRunEventBody.parse(await request.json())))
})
