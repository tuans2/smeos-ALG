import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateSaasAllowedNotificationChannels } from "@/modules/greeting-card/use-cases/staff-notification-settings"
import { staffNotifySaasPolicyBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/**
 * PUT /api/v1/greeting-card/integrations/staff-notifications/saas-policy
 * SaaS Platform Admin cấp phép danh sách kênh thông báo cho từng tiệm cụ thể.
 */
export const PUT = defineRoute({
  // Chính sách SaaS cho MỘT tổ chức khác nêu trong body — chỉ người vận hành nền tảng (N2).
  // Trước đây gác bằng mã R2 của tenant: ai tạo được đơn cũng sửa được kênh của mọi tổ chức
  // (rà soát 21/10/2026).
  auth: { kind: "platform", capability: "N2" },
  handler: async ({ request, pctx }) => {
    const body = await request.json().catch(() => null)
    const parsed = staffNotifySaasPolicyBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }
    const input = camelKeys(parsed.data)

    const result = await updateSaasAllowedNotificationChannels(
      input.targetOrganizationId,
      input.allowedChannels
    )

    return jsonResponse({ data: result })
  },
})
