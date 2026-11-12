import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { checkCapabilities } from "@/modules/integration/use-cases/check-capabilities"
import { checkCapabilitiesBody } from "@/modules/integration/contracts/http-requests"
import { defineRoute } from "@/core/http/define-route"

/** `POST /integration/capabilities/check` (đặc tả 06 mục 11): "Hỏi một người có năng lực gì". */
export const POST = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ request, ic }) => {
    const parsed = checkCapabilitiesBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const granted = await checkCapabilities(ic, {
      userId: parsed.data.user_id,
      codes: parsed.data.capability_codes,
    })

    return jsonResponse({ granted })
  },
})
