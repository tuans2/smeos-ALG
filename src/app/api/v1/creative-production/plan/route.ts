import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { planProduction } from "@/modules/creative-production/use-cases/dispatch-production-jobs"
import { planBody } from "@/app/api/v1/_contracts/requests-creative"

/**
 * `POST /api/v1/creative-production/plan` — Lập kế hoạch sản xuất Creative Production.
 *
 * Chấp nhận TopicProductionBrief, gọi planProduction() để tạo media plan
 * (không dispatch job thật — chỉ lên kế hoạch). User xác nhận rồi mới dispatch.
 *
 * Năng lực: `I1` (sáng tạo nội dung đa phương tiện).
 */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "I1")

  const parsed = planBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const brief = parsed.data.brief

  if (brief.organizationId !== ctx.organizationId) {
    throw validationFailed({ organizationId: "organizationId trong body phải khớp session" })
  }

  const result = planProduction({ brief })

  return jsonResponse(result, { status: 201 })
})