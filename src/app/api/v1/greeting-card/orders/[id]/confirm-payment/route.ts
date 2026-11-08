import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { adminConfirmBrochurePayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { dispatchAfterPaymentConfirmed } from "@/modules/greeting-card/use-cases/dispatch-after-payment"
import { confirmPaymentBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord)
  const { id } = await context.params

  const body = await request.json().catch(() => ({}))
  const parsed = confirmPaymentBody.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const result = await adminConfirmBrochurePayment(ctx, id, {
    amountVnd: parsed.data.amountVnd,
    reference: parsed.data.reference,
    note: parsed.data.note,
  })
  // Chuỗi: tiền đã ghi nhận → chọn cửa hàng gia công theo cài đặt; đơn đã mời rồi thì không phát lại
  const dispatch = await dispatchAfterPaymentConfirmed(ctx, id, { manualDispatch: parsed.data.manualDispatch })
  return jsonResponse({ data: { ...result, dispatch } })
})
