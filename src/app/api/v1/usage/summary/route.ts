import { jsonResponse } from "@/core/http/response"
import { getUsageSummary } from "@/modules/usage/use-cases/get-usage-summary"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G8" },
  handler: async ({ request, ctx }) => {
    return jsonResponse(await getUsageSummary(ctx, undefined, undefined, new URL(request.url).searchParams.get("period")))
  },
})
