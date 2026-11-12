/**
 * GET/PUT /api/v1/integrations/governance — chuỗi khoá/cấp sẵn tích hợp cho cửa hàng đối tác (W4, GĐ3).
 * Phạm vi luôn là tổ chức của phiên; tầng trên đã khoá → 422 `violation: LOCKED_BY_UPPER`.
 */

import { jsonResponse } from "@/core/http/response"
import { governanceBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { getChainGovernance, setChainGovernance } from "@/modules/integration-hub/use-cases/integration-governance"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getChainGovernance" },
  handler: async ({ ctx }) => {
    return jsonResponse({ items: await getChainGovernance(ctx) })
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getChainGovernance, setChainGovernance" },
  handler: async ({ request: req, ctx }) => {
    const parsed = governanceBody.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues.map((i) => i.path.join(".")) })
    await setChainGovernance(ctx, parsed.data)
    return jsonResponse({ items: await getChainGovernance(ctx) })
  },
})
