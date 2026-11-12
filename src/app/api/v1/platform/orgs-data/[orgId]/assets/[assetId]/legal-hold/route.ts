import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { setAssetLegalHold } from "@/modules/platform/use-cases/set-asset-legal-hold"
import { legalHoldBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

/** PUT — đặt/gỡ legal hold cho một asset (N14, SDAGF D-04). */
export const PUT = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { orgId, assetId } = params as { orgId: string; assetId: string }
    const parsed = legalHoldBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const data = await setAssetLegalHold(pctx, {
      organizationId: orgId,
      assetId,
      until: parsed.data.until ? new Date(parsed.data.until) : null,
      reason: parsed.data.reason,
    })
    return jsonResponse({ data })
  },
})
