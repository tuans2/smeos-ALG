/** POST /api/v1/integrations/connections — kết nối bằng khoá/token người dùng nhập (W2). */

import { jsonResponse } from "@/core/http/response"
import { connectBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { connectWithSecret } from "@/modules/integration-hub/use-cases/manage-connection"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: connectWithSecret" },
  handler: async ({ request: req, ctx }) => {
    const parsed = connectBody.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues.map((i) => i.path.join(".")) })
    const connection = await connectWithSecret(ctx, {
      connectorKey: parsed.data.connectorKey,
      secret: parsed.data.secret,
      ...(parsed.data.options ? { options: parsed.data.options } : {}),
    })
    return jsonResponse({ connection }, { status: 201 })
  },
})
