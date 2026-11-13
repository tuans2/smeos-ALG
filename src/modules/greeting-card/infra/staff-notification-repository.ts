import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import type { MessageRole } from "../domain/internal-message"
import type { StaffNotifyChannel } from "../domain/staff-notification-types"

export interface StaffRecipientMember {
  userId: string
  name: string
  email: string
  phone: string | null
  role: MessageRole
}

export interface StaffIntegrationConfig {
  staffNotifyEnabled: boolean
  staffNotifyChannels: StaffNotifyChannel[]
  staffNotifyConfigEncrypted: string | null
  staffNotifyEvents: Record<string, boolean>
}

export class StaffNotificationRepository {
  constructor(private readonly db = prisma) {}

  /**
   * Đọc danh sách kênh được SaaS Admin cấp phép cho tiệm trong organizations.settings
   */
  async getSaasAllowedChannels(organizationId: string): Promise<StaffNotifyChannel[]> {
    const org = await this.db.organizations.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    })

    const settings = org?.settings as Record<string, unknown> | null
    const allowed = settings?.allowed_notification_channels
    if (Array.isArray(allowed) && allowed.length > 0) {
      return allowed as StaffNotifyChannel[]
    }
    // Mặc định hỗ trợ tất cả các kênh
    return ["APP_INBOX", "ZALO", "SMS", "TELEGRAM", "WHATSAPP", "MESSENGER"]
  }

  /**
   * Đọc cấu hình thông báo nội bộ của tiệm từ greeting_integrations
   */
  async getShopStaffNotificationConfig(organizationId: string): Promise<StaffIntegrationConfig | null> {
    const row = await this.db.greeting_integrations.findUnique({
      where: { organization_id: organizationId },
      select: {
        staff_notify_enabled: true,
        staff_notify_channels: true,
        staff_notify_config_encrypted: true,
        staff_notify_events: true,
      },
    })
    if (!row) return null

    return {
      staffNotifyEnabled: row.staff_notify_enabled,
      staffNotifyChannels: (row.staff_notify_channels as StaffNotifyChannel[] | null) ?? [],
      staffNotifyConfigEncrypted: row.staff_notify_config_encrypted,
      staffNotifyEvents: (row.staff_notify_events as Record<string, boolean> | null) ?? {},
    }
  }

  /**
   * Cập nhật cấu hình thông báo nội bộ của tiệm
   */
  async updateShopStaffNotificationConfig(
    ctx: TenantContext,
    data: {
      enabled: boolean
      channels: StaffNotifyChannel[]
      events?: Record<string, boolean> | undefined
      sealedConfig?: string | undefined
    }
  ) {
    const fields = {
      staff_notify_enabled: data.enabled,
      staff_notify_channels: data.channels,
      staff_notify_events: data.events ?? {},
      ...(data.sealedConfig ? { staff_notify_config_encrypted: data.sealedConfig } : {}),
    }

    return this.db.greeting_integrations.upsert({
      where: { organization_id: ctx.organizationId },
      create: { organization_id: ctx.organizationId, ...fields },
      update: fields,
    })
  }

  /**
   * Tìm nhân viên theo vai trò trong tiệm (ACTIVE)
   */
  async findRecipientsByRole(
    organizationId: string,
    targetRole: MessageRole,
    specificUserId?: string | null
  ): Promise<StaffRecipientMember[]> {
    const roleKeys =
      targetRole === "ADMIN"
        ? ["dieu_hanh", "admin", "owner"]
        : targetRole === "COORDINATOR"
        ? ["dieu_phoi", "coordinator"]
        : ["sale", "sales"]

    const whereCondition: Record<string, unknown> = {
      organization_id: organizationId,
      status: "ACTIVE",
    }
    if (specificUserId) {
      whereCondition.user_id = specificUserId
    }

    const members = await this.db.memberships.findMany({
      where: whereCondition,
      select: {
        user_id: true,
        user: { select: { name: true, email: true, phone: true } },
        role_id: true,
      },
    })

    // Lấy thông tin roles để phân loại
    const roleIds = [...new Set(members.map((m) => m.role_id))]
    const roles = await this.db.roles.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, key: true },
    })
    const roleKeyMap = new Map(roles.map((r) => [r.id, r.key]))

    return members
      .filter((m) => {
        if (specificUserId && m.user_id === specificUserId) return true
        const key = roleKeyMap.get(m.role_id)
        return key ? roleKeys.includes(key.toLowerCase()) : targetRole === "SALE"
      })
      .map((m) => ({
        userId: m.user_id,
        name: m.user.name?.trim() || m.user.email.split("@")[0] || "Nhân viên",
        email: m.user.email,
        phone: m.user.phone ?? null,
        role: targetRole,
      }))
  }

  /**
   * Lưu nhật ký thông báo nhân viên
   */
  async recordStaffNotification(data: {
    organizationId: string
    orderId?: string | null | undefined
    eventKey: string
    channel: StaffNotifyChannel
    recipientRole?: MessageRole | null | undefined
    recipientId?: string | null | undefined
    recipientInfo?: string | null | undefined
    title?: string | null | undefined
    message?: string | null | undefined
    status: "SENT" | "FAILED" | "SKIPPED"
    providerMsgId?: string | null | undefined
    error?: string | null | undefined
  }) {
    try {
      return await this.db.staff_notifications.create({
        data: {
          organization_id: data.organizationId,
          order_id: data.orderId ?? null,
          event_key: data.eventKey,
          channel: data.channel,
          recipient_role: data.recipientRole ?? null,
          recipient_id: data.recipientId ?? null,
          recipient_info: data.recipientInfo ?? null,
          title: data.title ?? null,
          message: data.message ?? null,
          status: data.status,
          provider_msg_id: data.providerMsgId ?? null,
          error: data.error?.slice(0, 500) ?? null,
        },
      })
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === "P2003") {
        return null
      }
      throw err
    }
  }

  /**
   * Xem danh sách nhật ký thông báo
   */
  async listStaffNotifications(organizationId: string, limit = 50) {
    return this.db.staff_notifications.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: "desc" },
      take: Math.min(limit, 100),
    })
  }

  /**
   * Cập nhật danh sách kênh được SaaS Admin cấp phép cho tiệm
   */
  async updateSaasAllowedChannels(
    organizationId: string,
    allowedChannels: StaffNotifyChannel[]
  ): Promise<void> {
    const org = await this.db.organizations.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    })
    if (!org) {
      throw new Error("Không tìm thấy tổ chức")
    }

    const currentSettings = (org.settings as Record<string, unknown>) || {}
    await this.db.organizations.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          allowed_notification_channels: allowedChannels,
        },
      },
    })
  }
}

let _staffNotificationRepositorySingleton: StaffNotificationRepository | null = null
export function getStaffNotificationRepository(): StaffNotificationRepository {
  if (!_staffNotificationRepositorySingleton) _staffNotificationRepositorySingleton = new StaffNotificationRepository()
  return _staffNotificationRepositorySingleton
}
