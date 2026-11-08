import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { requestDiscount } from "@/modules/greeting-card/use-cases/discount-requests"
import { discountRequestBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

/** POST /api/v1/greeting-card/orders/[id]/discount-request — sale xin giảm giá, gửi thẳng Điều hành. */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.manage)
  const { id } = await context.params
  const parsed = discountRequestBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { reason, ...ask } = parsed.data
  return jsonResponse({ data: await requestDiscount(ctx, { orderId: id, ask, reason }) }, { status: 201 })
})
