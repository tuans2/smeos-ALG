import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { editAnalysis } from "@/modules/products/use-cases/edit-analysis"
import { getAnalysis } from "@/modules/products/use-cases/get-analysis"
import { editAnalysisBody } from "@/app/api/v1/_contracts/requests-ai-studio"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "H1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await getAnalysis(ctx, id))
  },
})

/** `PATCH /vision/analyses/:id` (`H2`, đặc tả 06 mục 8) — ghi vào `edited`. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "H2" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = editAnalysisBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    return jsonResponse(await editAnalysis(ctx, id, parsed.data.edited))
  },
})
