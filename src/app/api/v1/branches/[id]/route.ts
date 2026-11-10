import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { updateBranchBody } from "@/app/api/v1/_contracts/requests-chain"
import { updateBranch } from "@/modules/organization/use-cases/update-branch"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"

export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F7")

  const parsed = updateBranchBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  if (Object.keys(parsed.data).length === 0) {
    throw validationFailed({ body: "Không có trường nào để sửa" })
  }

  const { id } = await context.params
  const branch = await updateBranch(ctx, id, parsed.data)
  return jsonResponse({ branch })
})
