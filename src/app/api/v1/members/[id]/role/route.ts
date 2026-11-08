import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { changeMemberRole } from "@/modules/organization/use-cases/change-member-role"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { memberRoleBody } from "@/app/api/v1/_contracts/requests-org"

export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F5")

  const parsed = memberRoleBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const { id } = await context.params
  const membership = await changeMemberRole(ctx, id, parsed.data.role_id)
  return jsonResponse({ membership })
})
