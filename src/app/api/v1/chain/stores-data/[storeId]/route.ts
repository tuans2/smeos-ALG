/**
 * GET /api/v1/chain/stores-data/[storeId]
 *
 * Returns hierarchical domain folder data for a specific store.
 */

import { jsonResponse } from "@/core/http/response"
import { getStoreFolderData } from "@/modules/field-platform/use-cases/get-store-folder-data"
import { notFound } from "@/core/http/errors"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx, params: routeParams }) => {
    const params = routeParams as { storeId: string }
    const storeId = params.storeId

    const result = await getStoreFolderData(storeId, ctx.organizationId)
    if (!result) {
      throw notFound()
    }

    return jsonResponse({ data: result })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
