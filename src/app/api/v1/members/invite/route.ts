import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { inviteMember } from "@/modules/organization/use-cases/invite-member"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { inviteMemberBody } from "@/app/api/v1/_contracts/requests-org"

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F3")

  const parsed = inviteMemberBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const membership = await inviteMember(ctx, {
    email: parsed.data.email,
    roleId: parsed.data.role_id,
    branchId: parsed.data.branch_id ?? null,
  })
  return jsonResponse({ membership }, { status: 201 })
})
