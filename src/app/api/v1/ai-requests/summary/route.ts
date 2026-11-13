import { jsonResponse } from "@/core/http/response"
import { summarizeAiRequests } from "@/modules/ai-governance/use-cases/list-ai-requests"
import { readFilter } from "../filter"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "U3" },
  handler: async ({ request, ctx }) => {
    return jsonResponse(await summarizeAiRequests(ctx, readFilter(request.url)))
  },
})
