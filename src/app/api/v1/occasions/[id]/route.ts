import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { updateOccasion } from "@/modules/organization/use-cases/update-occasion"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { updateOccasionBody } from "@/app/api/v1/_contracts/requests-marketing"

export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")

  const parsed = updateOccasionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  if (Object.keys(parsed.data).length === 0) {
    throw validationFailed({ body: "Không có trường nào để sửa" })
  }

  const { id } = await context.params
  const occasion = await updateOccasion(ctx, id, parsed.data)
  return jsonResponse({ occasion })
})
