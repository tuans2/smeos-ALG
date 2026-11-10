import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { updateRoleCapabilities } from "@/modules/organization/use-cases/update-role-capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { updateRoleCapabilitiesBody } from "@/app/api/v1/_contracts/requests-admin"

/**
 * Yêu cầu bật một mã bị trần cứng chặn trả 403 và không ghi gì (đặc tả 06
 * mục 4) — `updateRoleCapabilities` kiểm hết mọi thay đổi trước khi ghi bất
 * kỳ thay đổi nào.
 */
export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F5")

  const parsed = updateRoleCapabilitiesBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const { id } = await context.params
  const capabilities = await updateRoleCapabilities(ctx, id, parsed.data.changes)
  return jsonResponse({ capabilities })
})
