
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { issueIntegrationTokenBody } from "@/app/api/v1/_contracts/requests-integrations"
import { issueIntegrationToken } from "@/modules/integration/use-cases/issue-integration-token"
import { listIntegrationTokens } from "@/modules/integration/use-cases/list-integration-tokens"
import { defineRoute } from "@/core/http/define-route"

/** `GET /integration-tokens` (`F9`, P7) — metadata mọi token của tổ chức, không có `token_hash`. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F9" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listIntegrationTokens(ctx) })
  },
})

/**
 * `POST /integration-tokens` (`F9`). Giá trị token thật chỉ xuất hiện trong
 * chính đáp ứng này — cơ sở dữ liệu chỉ giữ HMAC, nên mất bản ghi đáp ứng
 * này là mất token, phải xoay lại (`POST /integration-tokens/:id/rotate`).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F9" },
  handler: async ({ request, ctx, resolved }) => {
    const parsed = issueIntegrationTokenBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await issueIntegrationToken(ctx, {
      client: parsed.data.client,
      createdBy: resolved.user.id,
      ttlDays: parsed.data.ttl_days,
    })

    return jsonResponse(result, { status: 201 })
  },
})
