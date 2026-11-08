import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import {
  getStaffNotificationSettings,
  updateStaffNotificationSettings,
} from "@/modules/greeting-card/use-cases/staff-notification-settings"
import { staffNotifyBody } from "@/app/api/v1/_contracts/requests-greeting"

/**
 * GET /api/v1/greeting-card/integrations/staff-notifications
 * Đọc cấu hình thông báo nhân viên & danh sách kênh được SaaS cho phép.
 */
export const GET = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.integrationManage)

  const settings = await getStaffNotificationSettings(ctx)
  return jsonResponse({ data: settings })
})

/**
 * PUT /api/v1/greeting-card/integrations/staff-notifications
 * Shop Admin cập nhật cấu hình kênh thông báo nhân viên.
 */
export const PUT = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.integrationManage)

  const body = await request.json().catch(() => null)
  const parsed = staffNotifyBody.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const result = await updateStaffNotificationSettings(ctx, {
    enabled: parsed.data.enabled,
    channels: parsed.data.channels,
    ...(parsed.data.events ? { events: parsed.data.events } : {}),
    ...(parsed.data.credentials ? { credentials: parsed.data.credentials } : {}),
  })
  return jsonResponse({ data: result })
})
