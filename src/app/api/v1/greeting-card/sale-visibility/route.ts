import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { getSaleVisibility, setSaleVisibility } from "@/modules/greeting-card/use-cases/sale-visibility"
import { saleVisibilityBody } from "@/app/api/v1/_contracts/requests-greeting"

/** GET /api/v1/greeting-card/sale-visibility — mặc định + lựa chọn riêng từng sale (F2). */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.integrationManage)
  return jsonResponse({ data: await getSaleVisibility(ctx) })
})

/** PUT — `{ mode }` đổi mặc định; `{ userId, mode }` chọn riêng; `mode: null` bỏ chọn riêng. */
export const PUT = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.integrationManage)
  const parsed = saleVisibilityBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  if (!parsed.data.userId && !parsed.data.mode) throw validationFailed({ mode: "Chọn chế độ mặc định" })
  return jsonResponse({ data: await setSaleVisibility(ctx, parsed.data) })
})
