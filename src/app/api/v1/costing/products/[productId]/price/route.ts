import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { applyPriceBody } from "@/app/api/v1/_contracts/requests-costing"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { applyPrice } from "@/modules/costing/use-cases/costing-service"

/** `POST /costing/products/:productId/price` (`L3`) — áp giá bán đã chọn ở #34; ghi `audit_logs` cùng giao dịch. */
export const POST = handle(async (request, context: { params: Promise<{ productId: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L3")
  const { productId } = await context.params
  const parsed = applyPriceBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await applyPrice(ctx, productId, parsed.data.price_vnd, parsed.data.scenario) })
})
