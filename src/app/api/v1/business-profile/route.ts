
import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { putBusinessProfileBody } from "@/app/api/v1/_contracts/requests-profile"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getBusinessProfile } from "@/modules/profiles/use-cases/get-business-profile"
import { putBusinessProfile } from "@/modules/profiles/use-cases/put-business-profile"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  return jsonResponse(await getBusinessProfile(ctx))
})

export const PUT = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")

  const parsed = putBusinessProfileBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  return jsonResponse(await putBusinessProfile(ctx, parsed.data))
})
