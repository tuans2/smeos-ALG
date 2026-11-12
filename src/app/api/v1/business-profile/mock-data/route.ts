import { jsonResponse } from "@/core/http/response"
import { industryMockDataBody } from "@/app/api/v1/_contracts/requests-profile"
import { requireCapability } from "@/core/rbac/capabilities"
import { validationFailed } from "@/core/http/errors"
import { applyIndustryMockData } from "@/modules/profiles/use-cases/apply-industry-mock-data"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: F2" },
  handler: async ({ request, ctx }) => {
    // Cho phép người dùng có quyền F2 (Sửa hồ sơ), H4 (Toàn quyền điều hành) hoặc N1/N12 (SuperAdmin / Vận hành)
    if (!ctx.capabilities.has("F2") && !ctx.capabilities.has("H4") && !ctx.capabilities.has("N1") && !ctx.capabilities.has("N12")) {
      requireCapability(ctx, "F2")
    }

    const body = await request.json().catch(() => ({}))
    const parsed = industryMockDataBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const targetIndustry = parsed.data?.industry_key

    const result = await applyIndustryMockData(ctx, targetIndustry)

    return jsonResponse({
      success: true,
      data: result,
    })
  },
})
