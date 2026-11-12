import { jsonResponse } from "@/core/http/response"
import { approveAnalysis } from "@/modules/products/use-cases/approve-analysis"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /vision/analyses/:id/approve` (`H3`, đặc tả 06 mục 8). Duyệt một
 * bản ghi đã `APPROVED` trả 409 — `approveAnalysis` tự ném `conflict()`,
 * `handle()` dịch thành đáp ứng đúng hình dạng.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    let createProduct = true
    try {
      const body = (await request.json().catch(() => null)) as { create_product?: boolean } | null
      if (typeof body?.create_product === "boolean") {
        createProduct = body.create_product
      }
    } catch {
      // ignore
    }

    return jsonResponse(await approveAnalysis(ctx, id, { createProduct }))
  },
})
