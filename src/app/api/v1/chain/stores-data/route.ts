/**
 * GET /api/v1/chain/stores-data
 *
 * Returns list of store card summaries for the Consolidated Chain Data Hub (/du-lieu).
 */

import { jsonResponse } from "@/core/http/response"
import { getChainStoresData } from "@/modules/field-platform/use-cases/get-chain-stores-data"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    const result = await getChainStoresData(ctx.organizationId)
    return jsonResponse({ data: result })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
