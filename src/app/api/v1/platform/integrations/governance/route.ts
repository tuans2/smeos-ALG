/**
 * GET/PUT /api/v1/platform/integrations/governance?scope=GLOBAL|industry:<key> — khoá/cấp sẵn tích hợp
 * cho toàn nền tảng hoặc một ngành (N16, GĐ3; D4: ngành là mã, không phải tổ chức). Ghi nhật ký nền tảng.
 */

import { handle, jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { getPlatformGovernance, setPlatformGovernance } from "@/modules/integration-hub/use-cases/integration-governance"
import { listAllIndustries } from "@/modules/organization/domain/industry-profile"
import { integrationGovernanceBody } from "@/app/api/v1/platform/_contracts/requests"

const industries = () => listAllIndustries().map((i) => ({ key: i.key, name: i.name }))

export const GET = handle(async (req) => {
  const pctx = await requirePlatformContext(req)
  const scope = new URL(req.url).searchParams.get("scope") ?? "GLOBAL"
  return jsonResponse({ scope, items: await getPlatformGovernance(pctx, scope), industries: industries() })
})

export const PUT = handle(async (req) => {
  const pctx = await requirePlatformContext(req)
  const parsed = integrationGovernanceBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues.map((i) => i.path.join(".")) })
  await setPlatformGovernance(pctx, parsed.data)
  return jsonResponse({ scope: parsed.data.scopeId, items: await getPlatformGovernance(pctx, parsed.data.scopeId), industries: industries() })
})
