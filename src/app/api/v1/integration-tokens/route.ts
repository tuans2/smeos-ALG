
import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { issueIntegrationTokenBody } from "@/app/api/v1/_contracts/requests-integrations"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { issueIntegrationToken } from "@/modules/integration/use-cases/issue-integration-token"
import { listIntegrationTokens } from "@/modules/integration/use-cases/list-integration-tokens"

/** `GET /integration-tokens` (`F9`, P7) — metadata mọi token của tổ chức, không có `token_hash`. */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F9")
  return jsonResponse({ data: await listIntegrationTokens(ctx) })
})

/**
 * `POST /integration-tokens` (`F9`). Giá trị token thật chỉ xuất hiện trong
 * chính đáp ứng này — cơ sở dữ liệu chỉ giữ HMAC, nên mất bản ghi đáp ứng
 * này là mất token, phải xoay lại (`POST /integration-tokens/:id/rotate`).
 */
export const POST = handle(async (request) => {
  const { ctx, resolved } = await requireTenantContext(request)
  requireCapability(ctx, "F9")

  const parsed = issueIntegrationTokenBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await issueIntegrationToken(ctx, {
    client: parsed.data.client,
    createdBy: resolved.user.id,
    ttlDays: parsed.data.ttl_days,
  })

  return jsonResponse(result, { status: 201 })
})
