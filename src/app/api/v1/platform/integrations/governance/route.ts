/**
 * GET/PUT /api/v1/platform/integrations/governance?scope=GLOBAL|industry:<key> — khoá/cấp sẵn tích hợp
 * cho toàn nền tảng hoặc một ngành (N16, GĐ3; D4: ngành là mã, không phải tổ chức). Ghi nhật ký nền tảng.
 */

import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { getPlatformGovernance, setPlatformGovernance } from "@/modules/integration-hub/use-cases/integration-governance"
import { listAllIndustries } from "@/modules/organization/domain/industry-profile"
import { integrationGovernanceBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

const industries = () => listAllIndustries().map((i) => ({ key: i.key, name: i.name }))

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request: req, pctx }) => {
    const scope = new URL(req.url).searchParams.get("scope") ?? "GLOBAL"
    return jsonResponse({ scope, items: await getPlatformGovernance(pctx, scope), industries: industries() })
  },
})

export const PUT = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request: req, pctx }) => {
    const parsed = integrationGovernanceBody.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues.map((i) => i.path.join(".")) })
    await setPlatformGovernance(pctx, parsed.data)
    return jsonResponse({ scope: parsed.data.scopeId, items: await getPlatformGovernance(pctx, parsed.data.scopeId), industries: industries() })
  },
})
