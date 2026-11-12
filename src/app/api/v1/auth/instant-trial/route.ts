import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { PENDING_APPROVAL_MESSAGE } from "@/modules/organization/domain/account-approval"
import { startInstantTrial } from "@/modules/organization/use-cases/instant-trial"
import { instantTrialBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  // Mỗi lần gọi tạo một tổ chức + nạp dữ liệu mẫu — chặn tạo hàng loạt từ một IP.
  auth: { kind: "custom", reason: "dùng thử tức thì — chưa có phiên" },
  rateLimit: { scope: "instant-trial-ip", limit: 5, windowMs: 60 * 60_000, per: "ip" },
  handler: async ({ request }) => {
    const parsed = instantTrialBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await startInstantTrial({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      industryKey: parsed.data.industry_key ?? undefined,
    })

    return jsonResponse(
      {
        user_id: result.userId,
        organization_id: result.organizationId,
        organization_name: result.organizationName,
        industry_key: result.industryKey,
        // PO 22/10/2026: dùng thử chờ superadmin duyệt — không mở phiên
        status: "PENDING_APPROVAL",
        message: PENDING_APPROVAL_MESSAGE,
      },
      { status: 202 }
    )
  },
})
