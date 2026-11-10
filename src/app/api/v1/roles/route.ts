import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { createRole } from "@/modules/organization/use-cases/create-role"
import { listRoles } from "@/modules/organization/use-cases/list-roles"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createRoleBody } from "@/app/api/v1/_contracts/requests-admin"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  return jsonResponse({ data: await listRoles(ctx), next_cursor: null })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F5")

  const parsed = createRoleBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const role = await createRole(ctx, { name: parsed.data.name })
  return jsonResponse({ role }, { status: 201 })
})
