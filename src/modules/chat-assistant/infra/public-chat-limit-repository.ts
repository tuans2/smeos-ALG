/**
 * Ghi hạn mức chat công khai đã được Admin nền tảng duyệt vào cấu hình các kênh
 * trang công khai của một tổ chức. Chỉ gọi từ use-case nền tảng (đã kiểm quyền).
 * Kênh chưa có dòng cấu hình → tạo dòng với trạng thái bật/tắt mặc định của kênh.
 */
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { ChannelConfig } from "../domain/channel-integration-types"
import { PUBLIC_CHAT_CHANNELS } from "../domain/public-chat-limit-request"
import { isChannelEnabledByDefault } from "../domain/public-chat-policy"

export async function writeApprovedPublicChatLimits(
  organizationId: string,
  limits: NonNullable<ChannelConfig["publicChatLimits"]>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const channel of PUBLIC_CHAT_CHANNELS) {
      const row = await tx.chat_channel_integrations.findUnique({
        where: { organization_id_channel: { organization_id: organizationId, channel } },
      })
      const current = (row?.config as ChannelConfig | null) ?? {}
      const config = { ...current, publicChatLimits: limits } as unknown as Prisma.InputJsonValue
      await tx.chat_channel_integrations.upsert({
        where: { organization_id_channel: { organization_id: organizationId, channel } },
        create: { organization_id: organizationId, channel, is_enabled: isChannelEnabledByDefault(channel), config },
        update: { config },
      })
    }
  })
}
