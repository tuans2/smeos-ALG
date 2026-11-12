import { jsonResponse } from "@/core/http/response"
import { getOptimization } from "@/modules/media/use-cases/get-optimization"
import { defineRoute } from "@/core/http/define-route"

/** `GET /media/optimizations/:id` (`I1`, đặc tả 06 mục 8). `:id` là `job_id`. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await getOptimization(ctx, id))
  },
})
