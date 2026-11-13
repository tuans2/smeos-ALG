import { jsonResponse } from "@/core/http/response"
import { cancelJob } from "@/modules/jobs/use-cases/cancel-job"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "G6" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ job: await cancelJob(ctx, id) })
  },
})
