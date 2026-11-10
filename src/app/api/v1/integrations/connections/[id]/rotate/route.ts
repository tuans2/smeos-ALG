/** POST /api/v1/integrations/connections/:id/rotate — thay khoá mới, kiểm trước khi lưu (W3). */

import { handle, jsonResponse } from "@/core/http/response"
import { rotateSecretBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { rotateCredential } from "@/modules/integration-hub/use-cases/manage-connection"

export const POST = handle(async (req, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(req)
  const { id } = await context.params
  const parsed = rotateSecretBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ secret: "Cần nhập khoá mới" })
  return jsonResponse({ connection: await rotateCredential(ctx, { id, secret: parsed.data.secret }) })
})
