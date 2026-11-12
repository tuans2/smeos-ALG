import { z } from "zod"

import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { getPartnerStatement, SETTLEMENT_CAPABILITY } from "@/modules/coordinator/use-cases/partner-settlements"

/** GET /api/v1/coordinator/partners/[id]/statement?from&to (R19) — bảng kê tiền công đối tác theo kỳ (audit BL-22). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: SETTLEMENT_CAPABILITY },
  query: z.object({ from: z.string().max(10), to: z.string().max(10) }),
  handler: async ({ ctx, params, query }) => ok(await getPartnerStatement(ctx, params.id ?? "", query)),
})
