import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { listPaymentEvents } from "@/modules/greeting-card/use-cases/payment-webhook"
import { parseListQuery, toPage } from "@/modules/greeting-card/contracts/list-query"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { defineRoute } from "@/core/http/define-route"

const STATUSES = ["RECEIVED", "MATCHED", "UNMATCHED", "IGNORED"] as const

/**
 * GET /api/v1/greeting-card/payment-events?status=UNMATCHED — giao dịch ngân hàng nhận qua webhook.
 * Đọc: R19 (Kế toán đối soát, chỉ xem) hoặc R11 (người xác nhận tiền).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: GREETING_CARD_CAPABILITY.paymentRecord, R19" },
  handler: async ({ request, ctx }) => {
    if (!hasCapability(ctx, "R19")) requireCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord)
    const url = new URL(request.url)
    const raw = url.searchParams.get("status") || undefined
    const status = STATUSES.find((s) => s === raw)
    if (raw && !status) throw validationFailed({ status: `Phải là một trong: ${STATUSES.join(", ")}` })
    const { limit, cursor } = parseListQuery(url)
    const rows = await listPaymentEvents(ctx, { status, limit, cursor })
    return jsonResponse(toPage(rows, limit))
  },
})
