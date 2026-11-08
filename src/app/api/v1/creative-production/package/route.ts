import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { packageCampaign } from "@/modules/creative-production/use-cases/package-campaign"
import { packageCampaignBody } from "@/app/api/v1/_contracts/requests-creative"

/**
 * `POST /api/v1/creative-production/package` — Đóng gói chiến dịch Creative Production.
 *
 * Nhận kết quả từ produceCreative() hoặc produceAuthentic(), gọi
 * packageCampaign() để tổng hợp CampaignPackage.
 *
 * Năng lực: `I1` (sáng tạo nội dung đa phương tiện).
 */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "I1")

  const parsed = packageCampaignBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = packageCampaign({
    campaignName: parsed.data.campaignName,
    authenticResult: parsed.data.authenticResult,
    creativeResult: parsed.data.creativeResult,
  })

  return jsonResponse(result, { status: 201 })
})