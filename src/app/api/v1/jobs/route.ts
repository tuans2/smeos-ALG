import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listJobs } from "@/modules/jobs/use-cases/list-jobs"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G4" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw validationFailed({ limit: "Phải là số nguyên" })
    }

    const result = await listJobs(ctx, { limit, cursor: url.searchParams.get("cursor") })
    return jsonResponse(result)
  },
})
