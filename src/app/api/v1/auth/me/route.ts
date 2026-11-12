import { jsonResponse } from "@/core/http/response"
import { describeSession } from "@/modules/organization/use-cases/describe-session"
import { resolveSession } from "@/modules/organization/use-cases/resolve-session"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "custom", reason: "đọc phiên của chính mình (resolveSession)" },
  handler: async ({ request }) => {
    const resolved = await resolveSession(request)
    return jsonResponse(await describeSession(resolved))
  },
})
