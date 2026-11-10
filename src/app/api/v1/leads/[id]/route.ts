/**
 * PATCH /api/v1/leads/[id] — đổi trạng thái chăm sóc / người phụ trách.
 * Q3: Cập nhật hồ sơ khách hàng.
 */

import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { updateLead } from "@/modules/acquisition/use-cases/manage-leads"
import { updateLeadBody } from "@/app/api/v1/_contracts/requests-marketing"

export const PATCH = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "Q3")
  const { id } = await context.params
  const parsed = updateLeadBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ body: "Dữ liệu không hợp lệ" })
  return jsonResponse(await updateLead(ctx, id, parsed.data))
})
