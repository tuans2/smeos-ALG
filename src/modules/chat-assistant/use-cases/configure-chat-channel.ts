/**
 * Configure Chat Channel Use Case (M08).
 * Kích hoạt, cấu hình và thu phí thuê bao kênh tích hợp AI Chat Assistant.
 */

import { requireCapability } from "@/core/rbac/capabilities"
import { validationFailed, AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { UsageRepository, getUsageRepository } from "@/modules/usage/infra/usage-repository"
import { ChatChannelRepository, getChatChannelRepository } from "../infra/chat-channel-repository"
import {
  canActivateChannel,
  calculateNewExpiry,
  validateChannelCredentials,
  getChannelPricing,
} from "../domain/channel-integration-rules"
import type {
  SupportedChatChannel,
  ChannelConfig,
  ChatChannelIntegration,
} from "../domain/channel-integration-types"
import { dropUnchangedSecrets } from "../domain/channel-secret-fields"

export interface ConfigureChatChannelInput {
  channel: SupportedChatChannel
  isEnabled: boolean
  config?: ChannelConfig | undefined
}

export async function configureChatChannel(
  ctx: TenantContext,
  input: ConfigureChatChannelInput,
  deps = {
    channelRepo: getChatChannelRepository() as ChatChannelRepository,
    orgRepo: getOrganizationRepository() as OrganizationRepository,
    usageRepo: getUsageRepository() as UsageRepository,
  }
): Promise<ChatChannelIntegration> {
  // Yêu cầu quyền điều hành cấu hình bot T4
  requireCapability(ctx, "T4")

  const pricing = getChannelPricing(input.channel)
  const existing = await deps.channelRepo.findByChannel(ctx, input.channel)
  const currentExpiry = existing?.subscriptionExpiresAt
    ? new Date(existing.subscriptionExpiresAt)
    : null

  let newExpiry: Date | null = currentExpiry

  const mergedConfig: ChannelConfig = {
    ...(existing?.config || {}),
    ...dropUnchangedSecrets(input.config || {}),
  }

  // Nếu người dùng bật kích hoạt kênh
  if (input.isEnabled) {
    const org = await deps.orgRepo.current(ctx)
    if (!org) {
      throw new AppError("NOT_FOUND", "Không tìm thấy thông tin tổ chức")
    }

    // Kiểm tra chốt chặn tài nguyên và biểu phí thuê bao kênh
    const check = canActivateChannel(input.channel, org.credit_balance, currentExpiry)
    if (!check.allowed) {
      throw new AppError("QUOTA_EXCEEDED", check.reason || "Số dư credit không đủ để kích hoạt kênh")
    }

    // Nếu là kênh có phí và cần trừ credit gia hạn / mua mới
    if (check.requiredCredit > 0) {
      const deducted = await deps.orgRepo.tryDeductCredit(ctx, check.requiredCredit, { service: "CHAT", reason: `Phí kênh ${input.channel}` })
      if (!deducted) {
        throw new AppError("QUOTA_EXCEEDED", "Không thể trừ credit của tổ chức")
      }

      await deps.usageRepo.record(ctx, {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        feature: `chat.channel.${input.channel.toLowerCase()}`,
        costCredit: check.requiredCredit,
        status: "COMPLETED",
        metadata: {
          channel: input.channel,
          channelName: pricing.name,
        },
      })

      newExpiry = calculateNewExpiry(currentExpiry, 30)
    }

    // Kiểm tra tính hợp lệ của thông số kỹ thuật API (nếu có)
    if (pricing.requiresSetup) {
      const validation = validateChannelCredentials(input.channel, mergedConfig)
      if (!validation.valid) {
        throw validationFailed({ credentials: validation.errors.join(", ") })
      }
    }
  }

  return deps.channelRepo.upsertChannel(ctx, {
    channel: input.channel,
    isEnabled: input.isEnabled,
    config: mergedConfig,
    subscriptionExpiresAt: newExpiry,
  })
}
