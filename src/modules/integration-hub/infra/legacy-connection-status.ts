/**
 * Trạng thái thật của các tích hợp chạy bằng phân hệ sẵn có (đầu nối MANAGED) — chỉ đọc,
 * lọc theo tổ chức của phiên. Không đọc hay trả bí mật: chỉ hỏi "đã cấu hình và đang bật chưa".
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"

export async function loadManagedConnectedKeys(ctx: TenantContext, now: Date = new Date()): Promise<Set<string>> {
  const [chatChannels, greeting, activeTokens] = await Promise.all([
    prisma.chat_channel_integrations.findMany({
      where: scopedWhere(ctx, { is_enabled: true, channel: { in: ["FACEBOOK_MESSENGER" as const, "ZALO_OA" as const] } }),
      select: { channel: true },
    }),
    prisma.greeting_integrations.findFirst({
      where: scopedWhere(ctx),
      select: {
        payment_webhook_enabled: true,
        payment_webhook_key_hash: true,
        notify_enabled: true,
        notify_channel: true,
        staff_notify_enabled: true,
        staff_notify_channels: true,
      },
    }),
    prisma.integration_tokens.count({ where: scopedWhere(ctx, { revoked_at: null, expires_at: { gt: now } }) }),
  ])

  const keys = new Set<string>()
  for (const row of chatChannels) keys.add(row.channel === "FACEBOOK_MESSENGER" ? "facebook_messenger" : "zalo_oa")
  if (greeting?.payment_webhook_enabled && greeting.payment_webhook_key_hash) keys.add("sepay")
  if (greeting?.notify_enabled && greeting.notify_channel === "ZNS") keys.add("zalo_zns")
  if (greeting?.notify_enabled && greeting.notify_channel === "ESMS") keys.add("esms")
  const staffChannels = Array.isArray(greeting?.staff_notify_channels) ? greeting.staff_notify_channels : []
  if (greeting?.staff_notify_enabled && staffChannels.includes("TELEGRAM")) keys.add("telegram")
  if (activeTokens > 0) keys.add("api_tokens")
  return keys
}
