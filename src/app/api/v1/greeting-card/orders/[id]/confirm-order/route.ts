/**
 * POST /api/v1/greeting-card/orders/[id]/confirm-order
 * Điều hành xác nhận đơn (Gate 1b — 1 Cửa hàng).
 *
 * DELETE /api/v1/greeting-card/orders/[id]/confirm-order (body: { reason })
 * Điều hành từ chối đơn → kích hoạt hoàn tiền tự động.
 */
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import {
  adminConfirmBrochureOrder,
  adminRejectBrochureOrder,
} from "@/modules/greeting-card/use-cases/admin-confirm-brochure-order"
import { confirmOrderBody, rejectNewOrderBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

type RouteCtx = { params: Promise<{ id: string }> }

/** Điều hành xác nhận đơn có thể thực thi (Gate 1b) */
export const POST = handle<[RouteCtx]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  // Dùng chung năng lực paymentRecord (R11 — Điều hành) — cùng người xác nhận tiền và đơn
  requireCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord)
  const { id } = await context.params

  const body = await request.json().catch(() => ({}))
  const parsed = confirmOrderBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await adminConfirmBrochureOrder(ctx, id, { note: parsed.data.note })
  return jsonResponse({ data: result })
})

/** Điều hành từ chối đơn → hoàn tiền tự động */
export const DELETE = handle<[RouteCtx]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord)
  const { id } = await context.params

  const body = await request.json().catch(() => ({}))
  const parsed = rejectNewOrderBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await adminRejectBrochureOrder(ctx, id, { reason: parsed.data.reason })
  return jsonResponse({ data: result })
})
