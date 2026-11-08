import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { markPaymentEventHandled } from "@/modules/greeting-card/use-cases/payment-webhook"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { paymentEventHandleBody } from "@/app/api/v1/_contracts/requests-greeting"

/** POST /api/v1/greeting-card/payment-events/[id]/handle — đánh dấu đã xử lý tay. */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord)
  const { id } = await context.params
  const parsed = paymentEventHandleBody.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await markPaymentEventHandled(ctx, id, parsed.data.note) })
})
