import { jsonResponse } from "@/core/http/response"
import { parseBody, qcInspectionSchema } from "@/modules/coordinator/adapters/http-schemas"
import { recordQcInspection } from "@/modules/coordinator/use-cases/operations"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `POST /api/v1/coordinator/orders/:id/qc` (R3) — kết luận QC do người kiểm (F10). Không nhận điểm AI từ client. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, qcInspectionSchema)
    const order = await recordQcInspection(ctx, id, body)
    return jsonResponse({ order })
  },
})
