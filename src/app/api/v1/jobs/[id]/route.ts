import { jsonResponse } from "@/core/http/response"
import { getJob } from "@/modules/jobs/use-cases/get-job"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G4" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ job: await getJob(ctx, id) })
  },
})
