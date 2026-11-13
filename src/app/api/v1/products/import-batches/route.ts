import { jsonResponse } from "@/core/http/response"
import { listImportBatches } from "@/modules/products/use-cases/product-import-batches"
import { defineRoute } from "@/core/http/define-route"

/** `GET /products/import-batches` (`H3`) — 10 lô nhập Excel gần nhất, kèm còn hoàn tác được không. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listImportBatches(ctx) })
  },
})
