import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { cancelBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { gcCancelBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

/** POST /api/v1/greeting-card/orders/[id]/cancel — huỷ đơn Thẻ chào (R6). */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderCancel)
  const { id } = await context.params
  const parsed = gcCancelBody.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await cancelBrochureOrder(ctx, id, parsed.data.reason, parsed.data.confirmInTransit === true) })
})
