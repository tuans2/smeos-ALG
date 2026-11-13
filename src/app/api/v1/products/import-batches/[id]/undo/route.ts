import { jsonResponse } from "@/core/http/response"
import { undoImportBatch } from "@/modules/products/use-cases/product-import-batches"
import { defineRoute } from "@/core/http/define-route"

/** `POST /products/import-batches/:id/undo` (`H3`) — hoàn tác lô nhập trong 24 giờ. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await undoImportBatch(ctx, id))
  },
})
