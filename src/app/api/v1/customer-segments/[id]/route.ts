import { notFound, validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { getCustomerSegmentUseCase } from "@/modules/crm/use-cases/get-customer-segment.use-case"
import {
  updateCustomerSegmentUseCase,
  updateCustomerSegmentInputSchema,
} from "@/modules/crm/use-cases/update-customer-segment.use-case"
import { deleteCustomerSegmentUseCase } from "@/modules/crm/use-cases/delete-customer-segment.use-case"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: M4, Q1" },
  handler: async ({ ctx, params }) => {
    if (!hasCapability(ctx, "M4") && !hasCapability(ctx, "Q1")) {
      requireCapability(ctx, "M4")
    }

    const { id } = params as { id: string }
    const segment = await getCustomerSegmentUseCase(ctx, id)
    if (!segment) {
      throw notFound()
    }

    return jsonResponse({ data: segment })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "M4" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }

    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") {
      throw validationFailed({ body: "Dữ liệu yêu cầu không hợp lệ" })
    }

    const parsed = updateCustomerSegmentInputSchema.safeParse(raw)
    if (!parsed.success) {
      const details: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        details[issue.path.join(".")] = issue.message
      }
      throw validationFailed(details)
    }

    const updated = await updateCustomerSegmentUseCase(ctx, id, parsed.data)
    if (!updated) {
      throw notFound()
    }

    return jsonResponse({ data: updated })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "M4" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const ok = await deleteCustomerSegmentUseCase(ctx, id)
    if (!ok) {
      throw notFound()
    }

    return jsonResponse({ success: true })
  },
})

