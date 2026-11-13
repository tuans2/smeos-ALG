import { jsonResponse } from "@/core/http/response"
import { parseBody, updateStageSchema } from "@/modules/coordinator/adapters/http-schemas"
import type { CoordinatorStage } from "@/modules/coordinator/domain/coordinator-types"
import { updateCoordinatorStage } from "@/modules/coordinator/use-cases/update-coordinator-stage"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `PATCH /api/v1/coordinator/orders/:id/stage` (R3) — chuyển bước; máy chủ kiểm luồng và bằng chứng (409 nếu sai luồng). */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, updateStageSchema)
    const order = await updateCoordinatorStage(ctx, id, body.stage as CoordinatorStage, body.nextAction)
    return jsonResponse({ order })
  },
})
