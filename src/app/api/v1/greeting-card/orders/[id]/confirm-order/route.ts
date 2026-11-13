/**
 * POST /api/v1/greeting-card/orders/[id]/confirm-order
 * Điều hành xác nhận đơn (Gate 1b — 1 Cửa hàng).
 *
 * DELETE /api/v1/greeting-card/orders/[id]/confirm-order (body: { reason })
 * Điều hành từ chối đơn → kích hoạt hoàn tiền tự động.
 */
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import {
  adminConfirmBrochureOrder,
  adminRejectBrochureOrder,
} from "@/modules/greeting-card/use-cases/admin-confirm-brochure-order"
import { confirmOrderBody, rejectNewOrderBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"

type RouteCtx = { params: Promise<{ id: string }> }

/** Điều hành xác nhận đơn có thể thực thi (Gate 1b) */
export const POST = defineRoute({
  // Dùng chung năng lực paymentRecord (R11 — Điều hành) — cùng người xác nhận tiền và đơn
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.paymentRecord },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }

    const body = await request.json().catch(() => ({}))
    const parsed = confirmOrderBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await adminConfirmBrochureOrder(ctx, id, { note: parsed.data.note })
    return jsonResponse({ data: result })
  },
})

/** Điều hành từ chối đơn → hoàn tiền tự động */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.paymentRecord },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }

    const body = await request.json().catch(() => ({}))
    const parsed = rejectNewOrderBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await adminRejectBrochureOrder(ctx, id, { reason: parsed.data.reason })
    return jsonResponse({ data: result })
  },
})
