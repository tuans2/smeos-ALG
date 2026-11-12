import { jsonResponse } from "@/core/http/response"
import { convertQuotationToOrderUseCase } from "@/modules/sales/use-cases/convert-quotation-to-order.use-case"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R15" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const result = await convertQuotationToOrderUseCase(ctx, id)

    return jsonResponse({ data: result })
  },
})

