import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listUsage } from "@/modules/usage/use-cases/list-usage"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G8" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw validationFailed({ limit: "Phải là số nguyên" })
    }

    const result = await listUsage(ctx, { limit, cursor: url.searchParams.get("cursor") })
    return jsonResponse(result)
  },
})
