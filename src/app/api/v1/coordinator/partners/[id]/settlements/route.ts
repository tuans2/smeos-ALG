import { z } from "zod"

import { created } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { createPartnerSettlement, SETTLEMENT_CAPABILITY } from "@/modules/coordinator/use-cases/partner-settlements"

/** POST /api/v1/coordinator/partners/[id]/settlements (R19) — lập sổ quyết toán một kỳ từ bảng kê (audit BL-22). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: SETTLEMENT_CAPABILITY },
  body: z.object({ from: z.string().max(10), to: z.string().max(10), note: z.string().max(500).optional() }),
  handler: async ({ ctx, params, body }) => created(await createPartnerSettlement(ctx, params.id ?? "", body)),
})
