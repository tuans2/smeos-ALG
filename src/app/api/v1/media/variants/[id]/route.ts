import { jsonResponse } from "@/core/http/response"
import { getVariantJob } from "@/modules/media/use-cases/get-variant-job"
import { defineRoute } from "@/core/http/define-route"

/** `GET /media/variants/:id` (`I4`) — `:id` là `job_id`. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I4" },
  handler: async ({ ctx, params }) => {
      const { id } = params as { id: string }
      return jsonResponse(await getVariantJob(ctx, id))
  },
})
