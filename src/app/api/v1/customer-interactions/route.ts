import { validationFailed } from "@/core/http/errors"
import { enumParam } from "@/core/http/query-params"
import { CUSTOMER_INTERACTION_CHANNELS, CUSTOMER_INTERACTION_DIRECTIONS } from "@/modules/crm/domain/customer-segment"
import { jsonResponse } from "@/core/http/response"
import { listCustomerInteractionsUseCase } from "@/modules/crm/use-cases/list-customer-interactions.use-case"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const customerId = url.searchParams.get("customer_id") ?? undefined
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
      customerId,
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
