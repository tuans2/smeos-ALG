import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { advancePartnerSettlement, SETTLEMENT_CAPABILITY } from "@/modules/coordinator/use-cases/partner-settlements"

/** POST /api/v1/coordinator/partner-settlements/[id]/reconcile (R19) — Chờ đối soát → Đã đối soát (audit BL-22). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: SETTLEMENT_CAPABILITY },
  handler: async ({ ctx, params }) => ok(await advancePartnerSettlement(ctx, params.id ?? "", "RECONCILE")),
})
