import { jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { parseBody, recordPaymentSchema } from "@/modules/coordinator/adapters/http-schemas"
import { listCoordinatorPayments, recordCoordinatorPayment } from "@/modules/coordinator/use-cases/record-payment"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `GET /api/v1/coordinator/orders/:id/payments` (R1, ĐP-4a) — sổ thu của một đơn. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const payments = await listCoordinatorPayments(ctx, id)
    return jsonResponse({ payments })
  },
})

/**
 * `POST /api/v1/coordinator/orders/:id/payments` (ĐP-4a, 26/09/2026, PO D2) —
 * ghi một dòng sổ thu. `kind = DEPOSIT/BALANCE` đòi R9 (Sales + Điều phối);
 * `kind = REFUND` đòi R10 (trần cứng điều hành — hoàn tiền ảnh hưởng doanh
 * thu đã ghi nhận, khác việc chỉ ghi nhận đã thu).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: R10, R9" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, recordPaymentSchema)
    if (body.kind === "REFUND") {
      requireCapability(ctx, "R10")
    } else {
      requireCapability(ctx, "R9")
    }
    const order = await recordCoordinatorPayment(ctx, id, body)
    return jsonResponse({ order }, { status: 201 })
  },
})
