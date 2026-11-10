/**
 * GET/PUT /api/v1/integrations/governance — chuỗi khoá/cấp sẵn tích hợp cho cửa hàng đối tác (W4, GĐ3).
 * Phạm vi luôn là tổ chức của phiên; tầng trên đã khoá → 422 `violation: LOCKED_BY_UPPER`.
 */

import { handle, jsonResponse } from "@/core/http/response"
import { governanceBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getChainGovernance, setChainGovernance } from "@/modules/integration-hub/use-cases/integration-governance"

export const GET = handle(async (req) => {
  const { ctx } = await requireTenantContext(req)
  return jsonResponse({ items: await getChainGovernance(ctx) })
})

export const PUT = handle(async (req) => {
  const { ctx } = await requireTenantContext(req)
  const parsed = governanceBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues.map((i) => i.path.join(".")) })
  await setChainGovernance(ctx, parsed.data)
  return jsonResponse({ items: await getChainGovernance(ctx) })
})
