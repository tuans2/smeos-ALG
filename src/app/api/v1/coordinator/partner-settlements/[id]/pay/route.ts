import { z } from "zod"

import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { advancePartnerSettlement, SETTLEMENT_CAPABILITY } from "@/modules/coordinator/use-cases/partner-settlements"

/** POST /api/v1/coordinator/partner-settlements/[id]/pay (R19) — Đã đối soát → Đã thanh toán, kèm mã phiếu chi (audit BL-22). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: SETTLEMENT_CAPABILITY },
  body: z.object({ payment_reference: z.string().max(120).optional() }),
  handler: async ({ ctx, params, body }) => ok(await advancePartnerSettlement(ctx, params.id ?? "", "PAY", { paymentReference: body.payment_reference })),
})
