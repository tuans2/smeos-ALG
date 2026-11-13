import { jsonResponse } from "@/core/http/response"
import { checkSession } from "@/modules/organization/use-cases/check-session"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "custom", reason: "kiểm phiên của chính mình còn sống (checkSession)" },
  handler: async ({ request }) => {
    await checkSession(request)
    return jsonResponse({ active: true })
  },
})
