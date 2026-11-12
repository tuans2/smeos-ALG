import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getVisionEngine, setVisionEngine } from "@/modules/products/use-cases/manage-vision-engine"
import { visionEngineBody } from "@/app/api/v1/_contracts/requests-ai-studio"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "H1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getVisionEngine(ctx))
  },
})

/** `PUT /vision/engine` (`H4`) — chỉ Điều hành, trần cứng ở danh mục năng lực. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "H4" },
  handler: async ({ request, ctx }) => {
    const parsed = visionEngineBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    return jsonResponse(await setVisionEngine(ctx, parsed.data.bo_may))
  },
})
