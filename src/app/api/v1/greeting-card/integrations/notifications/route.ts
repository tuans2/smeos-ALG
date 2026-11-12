import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateNotifySettings } from "@/modules/greeting-card/use-cases/notify-settings"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { notifySettingsBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/** PUT /api/v1/greeting-card/integrations/notifications — bật/tắt, kênh, thông tin kết nối (chỉ ghi), mẫu tin. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ request, ctx }) => {
    const parsed = notifySettingsBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await updateNotifySettings(ctx, parsed.data) })
  },
})
