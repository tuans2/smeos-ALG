/**
 * GET /api/v1/crm/customers/[id]/master-index
 * Trích xuất Customer Master Index đầy đủ.
 * Quyền: Q1
 */

import { jsonResponse } from "@/core/http/response"
import { getCustomerMasterIndex } from "@/modules/crm/use-cases/get-customer-master-index"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const customer = await getCustomerMasterIndex(ctx, id)
    return jsonResponse({ masterIndex: customer })
  },
})
