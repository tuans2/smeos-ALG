import { notFound } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { getPrintRenditionUseCase } from "@/modules/print/use-cases/get-print-rendition.use-case"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: M5, Q1" },
  handler: async ({ ctx, params }) => {
    if (!hasCapability(ctx, "M5") && !hasCapability(ctx, "Q1")) {
      requireCapability(ctx, "M5")
    }

    const { id } = params as { id: string }
    const rendition = await getPrintRenditionUseCase(ctx, id)
    if (!rendition) {
      throw notFound()
    }

    return jsonResponse({ data: rendition })
  },
})
