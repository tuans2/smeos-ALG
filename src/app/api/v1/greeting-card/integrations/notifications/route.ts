import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { updateNotifySettings } from "@/modules/greeting-card/use-cases/notify-settings"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { notifySettingsBody } from "@/app/api/v1/_contracts/requests-greeting"

/** PUT /api/v1/greeting-card/integrations/notifications — bật/tắt, kênh, thông tin kết nối (chỉ ghi), mẫu tin. */
export const PUT = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.integrationManage)
  const parsed = notifySettingsBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await updateNotifySettings(ctx, parsed.data) })
})
