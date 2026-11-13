/** POST /api/v1/integrations/connections/:id/rotate — thay khoá mới, kiểm trước khi lưu (W3). */

import { jsonResponse } from "@/core/http/response"
import { rotateSecretBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { rotateCredential } from "@/modules/integration-hub/use-cases/manage-connection"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: rotateCredential" },
  handler: async ({ request: req, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = rotateSecretBody.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ secret: "Cần nhập khoá mới" })
    return jsonResponse({ connection: await rotateCredential(ctx, { id, secret: parsed.data.secret }) })
  },
})
