import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { setAssetLegalHold } from "@/modules/platform/use-cases/set-asset-legal-hold"
import { legalHoldBody } from "@/app/api/v1/platform/_contracts/requests"

/** PUT — đặt/gỡ legal hold cho một asset (N14, SDAGF D-04). */
export const PUT = handle(async (request, context: { params: Promise<{ orgId: string; assetId: string }> }) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { orgId, assetId } = await context.params
  const parsed = legalHoldBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const data = await setAssetLegalHold(pctx, {
    organizationId: orgId,
    assetId,
    until: parsed.data.until ? new Date(parsed.data.until) : null,
    reason: parsed.data.reason,
  })
  return jsonResponse({ data })
})
