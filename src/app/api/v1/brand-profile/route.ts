
import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { putBrandProfileBody } from "@/app/api/v1/_contracts/requests-profile"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getBrandProfile } from "@/modules/profiles/use-cases/get-brand-profile"
import { putBrandProfile } from "@/modules/profiles/use-cases/put-brand-profile"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  return jsonResponse(await getBrandProfile(ctx))
})


export const PUT = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")

  const parsed = putBrandProfileBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  return jsonResponse(await putBrandProfile(ctx, parsed.data))
})
