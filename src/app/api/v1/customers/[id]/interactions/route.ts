import { validationFailed } from "@/core/http/errors"
import { enumParam } from "@/core/http/query-params"
import { CUSTOMER_INTERACTION_CHANNELS, CUSTOMER_INTERACTION_DIRECTIONS } from "@/modules/crm/domain/customer-segment"
import { jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { listCustomerInteractionsUseCase } from "@/modules/crm/use-cases/list-customer-interactions.use-case"
import {
  recordCustomerInteractionUseCase,
  recordCustomerInteractionInputSchema,
} from "@/modules/crm/use-cases/record-customer-interaction.use-case"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  handler: async ({ request, ctx, params: routeParams }) => {
    const { id } = routeParams as { id: string }
    const url = new URL(request.url)
    const channel = enumParam(url, "channel", CUSTOMER_INTERACTION_CHANNELS)
    const direction = enumParam(url, "direction", CUSTOMER_INTERACTION_DIRECTIONS)

    const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50
    const offset = url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : 0

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw validationFailed({ limit: "limit phải là số nguyên từ 1 đến 100" })
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw validationFailed({ offset: "offset phải là số nguyên không âm" })
    }

    const result = await listCustomerInteractionsUseCase(ctx, {
      customerId: id,
      channel,
      direction,
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
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: M4, Q1" },
  handler: async ({ request, ctx, params: routeParams }) => {
    if (!hasCapability(ctx, "M4") && !hasCapability(ctx, "Q1")) {
      requireCapability(ctx, "M4")
    }

    const { id } = routeParams as { id: string }

    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") {
      throw validationFailed({ body: "Dữ liệu yêu cầu không hợp lệ" })
    }

    const parsed = recordCustomerInteractionInputSchema.safeParse({
      ...raw,
      customerId: id,
    })
    if (!parsed.success) {
      const details: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        details[issue.path.join(".")] = issue.message
      }
      throw validationFailed(details)
    }

    const interaction = await recordCustomerInteractionUseCase(ctx, parsed.data)
    return jsonResponse({ data: interaction }, { status: 201 })
  },
})

