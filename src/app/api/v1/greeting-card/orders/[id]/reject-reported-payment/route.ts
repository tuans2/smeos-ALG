import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { rejectReportedPayment } from "@/modules/greeting-card/use-cases/reject-reported-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { rejectReportedPaymentBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

/** Điều hành cảnh báo "Chưa nhận được tiền" cho khoản khách đã báo chuyển. */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord)
  const { id } = await context.params

  const parsed = rejectReportedPaymentBody.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await rejectReportedPayment(ctx, id, { reason: parsed.data.reason })
  return jsonResponse({ data: result })
})
