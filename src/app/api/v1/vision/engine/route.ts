import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getVisionEngine, setVisionEngine } from "@/modules/products/use-cases/manage-vision-engine"
import { visionEngineBody } from "@/app/api/v1/_contracts/requests-ai-studio"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "H1")
  return jsonResponse(await getVisionEngine(ctx))
})

/** `PUT /vision/engine` (`H4`) — chỉ Điều hành, trần cứng ở danh mục năng lực. */
export const PUT = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "H4")

  const parsed = visionEngineBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  return jsonResponse(await setVisionEngine(ctx, parsed.data.bo_may))
})
