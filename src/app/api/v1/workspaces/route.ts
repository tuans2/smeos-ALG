import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { createWorkspace } from "@/modules/organization/use-cases/create-workspace"
import { listWorkspaces } from "@/modules/organization/use-cases/list-workspaces"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createWorkspaceBody } from "@/app/api/v1/_contracts/requests-admin"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  return jsonResponse({ data: await listWorkspaces(ctx), next_cursor: null })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F8")

  const parsed = createWorkspaceBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const workspace = await createWorkspace(ctx, parsed.data)
  return jsonResponse({ workspace }, { status: 201 })
})
