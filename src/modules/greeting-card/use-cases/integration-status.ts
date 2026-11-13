import type { TenantContext } from "@/core/tenancy"
import { GreetingIntegrationRepository, getGreetingIntegrationRepository } from "../infra/greeting-integration-repository"

/** Trạng thái tích hợp cho UI — chỉ gợi ý 4 ký tự cuối khoá, không lộ bí mật. */
export async function getIntegrationStatus(ctx: TenantContext, repo = getGreetingIntegrationRepository()) {
  const row = await repo.getForTenant(ctx)
  return {
    payment: {
      enabled: row?.payment_webhook_enabled ?? false,
      provider: row?.payment_provider ?? null,
      keyHint: row?.payment_webhook_key_hint ?? null,
      webhookPath: "/api/v1/public/payments/sepay",
    },
    notify: {
      enabled: row?.notify_enabled ?? false,
      channel: row?.notify_channel ?? null,
      configured: Boolean(row?.notify_config_encrypted),
      templates: (row?.notify_templates as Record<string, string> | null) ?? {},
    },
  }
}
