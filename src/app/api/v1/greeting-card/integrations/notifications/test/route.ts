import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { sendTestNotification } from "@/modules/greeting-card/use-cases/notify-settings"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { notifyTestBody } from "@/app/api/v1/_contracts/requests-greeting"

/** POST /api/v1/greeting-card/integrations/notifications/test — gửi một tin thử. */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.integrationManage)
  const parsed = notifyTestBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ phone: "Thiếu số điện thoại" })
  return jsonResponse({ data: await sendTestNotification(ctx, parsed.data.phone) })
})
