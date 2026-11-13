import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { sendTestNotification } from "@/modules/greeting-card/use-cases/notify-settings"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { notifyTestBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/greeting-card/integrations/notifications/test — gửi một tin thử. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ request, ctx }) => {
    const parsed = notifyTestBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ phone: "Thiếu số điện thoại" })
    return jsonResponse({ data: await sendTestNotification(ctx, parsed.data.phone) })
  },
})
