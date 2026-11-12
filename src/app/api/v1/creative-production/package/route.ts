import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { packageCampaign } from "@/modules/creative-production/use-cases/package-campaign"
import { packageCampaignBody } from "@/app/api/v1/_contracts/requests-creative"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /api/v1/creative-production/package` — Đóng gói chiến dịch Creative Production.
 *
 * Nhận kết quả từ produceCreative() hoặc produceAuthentic(), gọi
 * packageCampaign() để tổng hợp CampaignPackage.
 *
 * Năng lực: `I1` (sáng tạo nội dung đa phương tiện).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const parsed = packageCampaignBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = packageCampaign({
      campaignName: parsed.data.campaignName,
      authenticResult: parsed.data.authenticResult,
      creativeResult: parsed.data.creativeResult,
    })

    return jsonResponse(result, { status: 201 })
  },
})