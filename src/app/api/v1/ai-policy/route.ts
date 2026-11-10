import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { getAiPolicy } from "@/modules/ai-governance/use-cases/get-ai-policy"
import { putAiPolicy } from "@/modules/ai-governance/use-cases/put-ai-policy"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { putAiPolicyBody } from "@/app/api/v1/_contracts/requests-admin"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "U1")
  return jsonResponse(await getAiPolicy(ctx))
})

/**
 * Ghi TRẦN của một năng lực. Đổi `AIC-01` đòi thêm `H4` — kiểm trong use-case,
 * không kiểm ở đây, để đường ghi của engine ngoài về sau không đi vòng qua nó.
 */
export const PUT = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "U2")

  const parsed = putAiPolicyBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  return jsonResponse(await putAiPolicy(ctx, parsed.data))
})
