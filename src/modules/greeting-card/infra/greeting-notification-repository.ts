import { prisma } from "@/core/tenancy/infra/prisma"
import { withOrganizationIndustry } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import type { TenantContext } from "@/core/tenancy"
import { Prisma } from "@/generated/prisma/client"
import { isUniqueViolation } from "@/modules/coordinator/infra/transaction"

/** Cấu hình kênh thông báo + nhật ký tin đã gửi (greeting_notifications). */
export class GreetingNotificationRepository {
  constructor(private readonly db = prisma) {}

  async getChannelConfig(organizationId: string) {
    return this.db.greeting_integrations.findUnique({
      where: { organization_id: organizationId },
      select: { notify_enabled: true, notify_channel: true, notify_config_encrypted: true, notify_templates: true },
    })
  }

  async saveSealedCredentials(organizationId: string, sealed: string) {
    await this.db.greeting_integrations.update({
      where: { organization_id: organizationId },
      data: { notify_config_encrypted: sealed },
    })
  }

  async updateSettings(
    ctx: TenantContext,
    data: { enabled: boolean; channel: string; templates: Record<string, string>; sealedCredentials?: string | undefined }
  ) {
    const fields = {
      notify_enabled: data.enabled,
      notify_channel: data.channel,
      notify_templates: data.templates as Prisma.InputJsonValue,
      ...(data.sealedCredentials ? { notify_config_encrypted: data.sealedCredentials } : {}),
    }
    return this.db.greeting_integrations.upsert({
      where: { organization_id: ctx.organizationId },
      create: { organization_id: ctx.organizationId, ...fields },
      update: fields,
    })
  }

  /** Thông tin đơn cần cho tin nhắn — chỉ đơn Thẻ chào của đúng tổ chức. */
  async orderFacts(organizationId: string, orderId: string) {
    return withOrganizationIndustry(await this.db.orders.findFirst({
      where: { id: orderId, organization_id: organizationId, source: "BROCHURE" },
      select: {
        id: true,
        code: true,
        total_vnd: true,
        paid_vnd: true,
        pricing_rule_ref: true,
        source_session_id: true,
        customer: { select: { name: true, phone: true } },
        organization: { select: { name: true, ...ORG_SETTINGS_SELECT, business_profile: { select: { display_name: true } } } },
        qc_records: { select: { notes: true } },
      },
    }))
  }

  async sendCodeOf(organizationId: string, sessionId: string): Promise<string | null> {
    const s = await this.db.greeting_sessions.findFirst({
      where: { id: sessionId, organization_id: organizationId },
      select: { send_code: true },
    })
    return s?.send_code ?? null
  }

  /**
   * Giữ chỗ gửi một mốc (unique theo đơn + sự kiện). Trả `null` nếu mốc đã
   * gửi/đang gửi; mốc trước đó FAILED thì cho gửi lại.
   */
  async claim(organizationId: string, orderId: string, event: string, channel: string, recipientMasked: string) {
    try {
      return await this.db.greeting_notifications.create({
        data: { organization_id: organizationId, order_id: orderId, event_key: event, channel, recipient_masked: recipientMasked, status: "SENDING" },
      })
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      const retried = await this.db.greeting_notifications.updateMany({
        where: { organization_id: organizationId, order_id: orderId, event_key: event, status: "FAILED" },
        data: { status: "SENDING", channel, recipient_masked: recipientMasked, error: null },
      })
      if (retried.count === 0) return null
      return this.db.greeting_notifications.findFirstOrThrow({
        where: { organization_id: organizationId, order_id: orderId, event_key: event },
      })
    }
  }

  async finish(id: string, data: { status: "SENT" | "FAILED" | "SKIPPED"; providerMessageId?: string | null; error?: string | null }) {
    await this.db.greeting_notifications.update({
      where: { id },
      data: { status: data.status, provider_message_id: data.providerMessageId ?? null, error: data.error?.slice(0, 500) ?? null },
    })
  }
}

let _greetingNotificationRepositorySingleton: GreetingNotificationRepository | null = null
export function getGreetingNotificationRepository(): GreetingNotificationRepository {
  if (!_greetingNotificationRepositorySingleton) _greetingNotificationRepositorySingleton = new GreetingNotificationRepository()
  return _greetingNotificationRepositorySingleton
}
