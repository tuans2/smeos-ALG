import { jsonResponse } from "@/core/http/response"
import { sendQuotationUseCase } from "@/modules/sales/use-cases/send-quotation.use-case"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R15" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const quotation = await sendQuotationUseCase(ctx, id)

    return jsonResponse({ data: quotation })
  },
})

