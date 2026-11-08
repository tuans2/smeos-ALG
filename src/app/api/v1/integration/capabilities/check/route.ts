import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireIntegrationContext } from "@/modules/integration/use-cases/resolve-integration-context"
import { checkCapabilities } from "@/modules/integration/use-cases/check-capabilities"
import { checkCapabilitiesBody } from "@/modules/integration/contracts/http-requests"

/** `POST /integration/capabilities/check` (đặc tả 06 mục 11): "Hỏi một người có năng lực gì". */
export const POST = handle(async (request) => {
  const ic = await requireIntegrationContext(request)

  const parsed = checkCapabilitiesBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const granted = await checkCapabilities(ic, {
    userId: parsed.data.user_id,
    codes: parsed.data.capability_codes,
  })

  return jsonResponse({ granted })
})
