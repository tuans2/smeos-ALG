import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { putPricingRuleBody } from "@/app/api/v1/_contracts/requests-costing"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getPricingRules } from "@/modules/products/use-cases/get-pricing-rules"
import { putPricingRules } from "@/modules/products/use-cases/put-pricing-rules"

/**
 * `GET · PUT /pricing-rules` (`L5` · `L6`, đặc tả 06 mục 6) — "Theo tổ chức,
 * có thể theo chi nhánh". `branch_id` là tham số truy vấn/thân yêu cầu tuỳ
 * chọn — không có thì áp phạm vi của chính phiên (`ctx.branchId`).
 */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L5")

  const url = new URL(request.url)
  const branchId = url.searchParams.has("branch_id") ? url.searchParams.get("branch_id") : undefined
  return jsonResponse(await getPricingRules(ctx, branchId))
})

export const PUT = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L6")

  const parsed = putPricingRuleBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await putPricingRules(ctx, {
    key: parsed.data.key,
    value: parsed.data.value,
    branchId: parsed.data.branch_id ?? null,
  })
  return jsonResponse(result)
})
