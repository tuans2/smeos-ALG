import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getOrderSlip, setOrderVat } from "@/modules/greeting-card/use-cases/order-vat"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { gcVatBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/v1/greeting-card/orders/[id]/vat — VAT, tổng tiền + mã mẫu, ảnh gốc, ghi chú khách (Thẻ Đơn Khách hàng). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await getOrderSlip(ctx, id) })
  },
})

/** PUT /api/v1/greeting-card/orders/[id]/vat — bật/tắt VAT 8%/10% và lưu thông tin xuất hoá đơn. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.paymentRecord },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = gcVatBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)
    return jsonResponse({ data: await setOrderVat(ctx, id, input) })
  },
})
