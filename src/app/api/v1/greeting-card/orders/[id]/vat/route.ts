import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getOrderSlip, setOrderVat } from "@/modules/greeting-card/use-cases/order-vat"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { gcVatBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/v1/greeting-card/orders/[id]/vat — VAT, tổng tiền + mã mẫu, ảnh gốc, ghi chú khách (Thẻ Đơn Khách hàng). */
export const GET = handle<[Ctx]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderRead)
  const { id } = await context.params
  return jsonResponse({ data: await getOrderSlip(ctx, id) })
})

/** PUT /api/v1/greeting-card/orders/[id]/vat — bật/tắt VAT 8%/10% và lưu thông tin xuất hoá đơn. */
export const PUT = handle<[Ctx]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord)
  const { id } = await context.params
  const parsed = gcVatBody.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await setOrderVat(ctx, id, parsed.data) })
})
