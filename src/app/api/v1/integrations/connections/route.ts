/** POST /api/v1/integrations/connections — kết nối bằng khoá/token người dùng nhập (W2). */

import { jsonResponse } from "@/core/http/response"
import { connectBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { connectWithSecret } from "@/modules/integration-hub/use-cases/manage-connection"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: connectWithSecret" },
  handler: async ({ request: req, ctx }) => {
    const parsed = connectBody.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues.map((i) => i.path.join(".")) })
    const input = camelKeys(parsed.data)
    const connection = await connectWithSecret(ctx, {
      connectorKey: input.connectorKey,
      secret: input.secret,
      ...(input.options ? { options: input.options } : {}),
    })
    return jsonResponse({ connection }, { status: 201 })
  },
})
