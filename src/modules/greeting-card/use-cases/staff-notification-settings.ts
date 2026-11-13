import type { TenantContext } from "@/core/tenancy"
import { validationFailed } from "@/core/http/errors"
import { openSecret, sealSecret } from "@/core/security/secret-box"
import type { StaffNotifyChannel } from "../domain/staff-notification-types"
import { StaffNotificationRepository, getStaffNotificationRepository } from "../infra/staff-notification-repository"
import { STAFF_NOTIFY_SECRET_PURPOSE } from "./notify-staff"

export interface StaffNotificationSettingsDTO {
  enabled: boolean
  channels: StaffNotifyChannel[]
  events: Record<string, boolean>
  saasAllowedChannels: StaffNotifyChannel[]
  hasCredentials: boolean
}

export interface UpdateStaffNotificationInput {
  enabled: boolean
  channels: StaffNotifyChannel[]
  events?: Record<string, boolean> | undefined
  credentials?: Record<string, unknown> | undefined // Telegram bot token, chat ids, WhatsApp tokens...
}

export async function getStaffNotificationSettings(
  ctx: TenantContext,
  repo = getStaffNotificationRepository()
): Promise<StaffNotificationSettingsDTO> {
  const saasAllowed = await repo.getSaasAllowedChannels(ctx.organizationId)
  const shopConfig = await repo.getShopStaffNotificationConfig(ctx.organizationId)

  return {
    enabled: shopConfig?.staffNotifyEnabled ?? false,
    channels: shopConfig?.staffNotifyChannels ?? [],
    events: shopConfig?.staffNotifyEvents ?? {},
    saasAllowedChannels: saasAllowed,
    hasCredentials: Boolean(shopConfig?.staffNotifyConfigEncrypted),
  }
}

export async function updateStaffNotificationSettings(
  ctx: TenantContext,
  input: UpdateStaffNotificationInput,
  repo = getStaffNotificationRepository()
): Promise<{ success: boolean }> {
  const saasAllowed = await repo.getSaasAllowedChannels(ctx.organizationId)
  const saasSet = new Set(saasAllowed)

  // Kiểm tra kênh bật có được SaaS cấp phép không (ngoại trừ APP_INBOX luôn hợp lệ)
  for (const ch of input.channels) {
    if (ch !== "APP_INBOX" && !saasSet.has(ch)) {
      throw validationFailed({
        channels: `Kênh ${ch} chưa được Quản trị viên SaaS kích hoạt cho cửa hàng của bạn.`,
      })
    }
  }

  let sealedConfig: string | undefined
  if (input.credentials && Object.keys(input.credentials).length > 0) {
    sealedConfig = sealSecret(JSON.stringify(input.credentials), STAFF_NOTIFY_SECRET_PURPOSE)
  }

  await repo.updateShopStaffNotificationConfig(ctx, {
    enabled: input.enabled,
    channels: input.channels,
    events: input.events,
    sealedConfig,
  })

  return { success: true }
}

/**
 * Cấp phép kênh thông báo cho tiệm (Dành riêng cho SaaS Platform Admin).
 */
export async function updateSaasAllowedNotificationChannels(
  targetOrganizationId: string,
  allowedChannels: StaffNotifyChannel[],
  repo = getStaffNotificationRepository()
): Promise<{ success: boolean }> {
  try {
    await repo.updateSaasAllowedChannels(targetOrganizationId, allowedChannels)
    return { success: true }
  } catch {
    throw validationFailed({ organization: "Không tìm thấy tổ chức" })
  }
}
