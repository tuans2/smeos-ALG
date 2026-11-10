/** POST /api/v1/integrations/connections — kết nối bằng khoá/token người dùng nhập (W2). */

import { handle, jsonResponse } from "@/core/http/response"
import { connectBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { connectWithSecret } from "@/modules/integration-hub/use-cases/manage-connection"

export const POST = handle(async (req) => {
  const { ctx } = await requireTenantContext(req)
  const parsed = connectBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues.map((i) => i.path.join(".")) })
  const connection = await connectWithSecret(ctx, {
    connectorKey: parsed.data.connectorKey,
    secret: parsed.data.secret,
    ...(parsed.data.options ? { options: parsed.data.options } : {}),
  })
  return jsonResponse({ connection }, { status: 201 })
})
