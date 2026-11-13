import { validationFailed } from "@/core/http/errors"
import { enumParam } from "@/core/http/query-params"
import { CUSTOMER_SEGMENT_KINDS } from "@/modules/crm/domain/customer-segment"
import { jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import {
  createCustomerSegmentUseCase,
  createCustomerSegmentInputSchema,
} from "@/modules/crm/use-cases/create-customer-segment.use-case"
import { listCustomerSegmentsUseCase } from "@/modules/crm/use-cases/list-customer-segments.use-case"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: M4, Q1" },
  handler: async ({ request, ctx }) => {
    if (!hasCapability(ctx, "M4") && !hasCapability(ctx, "Q1")) {
      requireCapability(ctx, "M4")
    }

    const url = new URL(request.url)
    const kind = enumParam(url, "kind", CUSTOMER_SEGMENT_KINDS)
    const search = url.searchParams.get("search") ?? undefined

    const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50
    const offset = url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : 0

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw validationFailed({ limit: "limit phải là số nguyên từ 1 đến 100" })
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw validationFailed({ offset: "offset phải là số nguyên không âm" })
    }

    const result = await listCustomerSegmentsUseCase(ctx, {
      kind,
      search,
      limit,
      offset,
    })

    return jsonResponse({
      data: result.items,
      total: result.total,
      limit,
      offset,
    })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "M4" },
  handler: async ({ request, ctx }) => {
    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") {
      throw validationFailed({ body: "Dữ liệu yêu cầu không hợp lệ" })
    }

    const parsed = createCustomerSegmentInputSchema.safeParse(raw)
    if (!parsed.success) {
      const details: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        details[issue.path.join(".")] = issue.message
      }
      throw validationFailed(details)
    }

    const segment = await createCustomerSegmentUseCase(ctx, parsed.data)

    return jsonResponse({ data: segment }, { status: 201 })
  },
})

