import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { getSegmentCustomersUseCase } from "@/modules/crm/use-cases/get-segment-customers.use-case"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: M4, Q1" },
  handler: async ({ request, ctx, params }) => {
    if (!hasCapability(ctx, "M4") && !hasCapability(ctx, "Q1")) {
      requireCapability(ctx, "M4")
    }

    const { id } = params as { id: string }
    const url = new URL(request.url)
    const search = url.searchParams.get("search") ?? undefined

    const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50
    const offset = url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : 0

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw validationFailed({ limit: "limit phải là số nguyên từ 1 đến 100" })
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw validationFailed({ offset: "offset phải là số nguyên không âm" })
    }

    const result = await getSegmentCustomersUseCase(ctx, {
      segmentId: id,
      search,
      limit,
      offset,
    })

    return jsonResponse({
      data: result.items,
      segment_name: result.segmentName,
      total_matched: result.totalMatched,
      limit,
      offset,
    })
  },
})

