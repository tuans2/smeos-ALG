import { jsonResponse } from "@/core/http/response"
import { retryJob } from "@/modules/jobs/use-cases/retry-job"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "G7" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ job: await retryJob(ctx, id) })
  },
})
