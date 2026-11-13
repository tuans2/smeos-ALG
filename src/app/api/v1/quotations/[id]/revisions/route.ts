/** `GET /api/v1/quotations/:id/revisions` (R15) — lịch sử phiên bản báo giá (checklist ALG 3.10). */

import { jsonResponse } from "@/core/http/response"
import { listQuotationRevisionsUseCase } from "@/modules/sales/use-cases/list-quotation-revisions.use-case"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R15" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await listQuotationRevisionsUseCase(ctx, id) })
  },
})

export const dynamic = "force-dynamic"
