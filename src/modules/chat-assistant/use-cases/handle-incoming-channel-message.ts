/**
 * Handle Incoming Channel Message Use Case (M08).
 * Tiếp nhận và xử lý tin nhắn từ mọi kênh tiếp xúc (Messenger, Zalo OA, E-Catalog, Website ngoài).
 * Áp dụng chốt chặn tài nguyên và ghi nhận usage credit theo quy định của FloraOS-core.
 */

import { SalesConciergeProvider } from "../sales-concierge/adapters/sales-concierge-provider"
import { chatAnswerViaGateway } from "../adapters/chat-answer-gateway"
import { ChatChannelRepository, getChatChannelRepository } from "../infra/chat-channel-repository"
import { isChannelSubscriptionActive } from "../domain/channel-integration-rules"
import type { SupportedChatChannel } from "../domain/channel-integration-types"
import { isChannelEnabledByDefault } from "../domain/public-chat-policy"
import type { SuggestedProductCard } from "../domain/chat-types"
import { listProductMasterIndex } from "@/modules/products/use-cases/get-product-master-index"

export interface HandleChannelMessageInput {
  organizationId: string
  channel: SupportedChatChannel
  externalSenderId: string
  senderName?: string | undefined
  messageText: string
}

export interface HandleChannelMessageResult {
  replyText: string
  suggestedProducts: SuggestedProductCard[]
  conversationId: string
  channel: SupportedChatChannel
}

export async function handleIncomingChannelMessage(
  input: HandleChannelMessageInput,
  deps: { channelRepo: ChatChannelRepository; chatProvider?: SalesConciergeProvider | undefined } = {
    channelRepo: getChatChannelRepository(),
  }
): Promise<HandleChannelMessageResult> {
  const { organizationId, channel, externalSenderId, messageText } = input

  // 1. Kiểm tra trạng thái kích hoạt của kênh đối với tổ chức
  const channelConfig = await deps.channelRepo.getChannelConfigForOrg(organizationId, channel)

  const isEnabled = channelConfig?.isEnabled ?? isChannelEnabledByDefault(channel)
  const expiresAt = channelConfig?.subscriptionExpiresAt
    ? new Date(channelConfig.subscriptionExpiresAt)
    : null

  const isActive = isChannelSubscriptionActive(channel, isEnabled, expiresAt)

  if (!isActive) {
    return {
      replyText: "Trợ lý AI trên kênh này hiện đang tạm đóng. Nhân viên cửa hàng sẽ liên hệ lại quý khách sớm nhất!",
      suggestedProducts: [],
      conversationId: "",
      channel,
    }
  }

  // 2. Chốt chặn tài nguyên và trừ 1 credit phản hồi AI (Aegis Usage Protection)
  const creditDeducted = await deps.channelRepo.checkAndDeductUsageCredit(
    organizationId,
    1,
    channel,
    externalSenderId
  )

  if (!creditDeducted) {
    return {
      replyText: "Tư vấn viên AI đang bận xử lý nhiều đơn hàng. Nhân viên của tiệm sẽ phản hồi quý khách trong ít phút!",
      suggestedProducts: [],
      conversationId: "",
      channel,
    }
  }

  // 3. Tìm hoặc tạo hội thoại của khách hàng
  const conversationId = await deps.channelRepo.findOrCreateChannelConversation(
    organizationId,
    channel,
    externalSenderId
  )

  // 4. Lưu tin nhắn của khách hàng
  await deps.channelRepo.saveChannelMessage(
    organizationId,
    conversationId,
    "USER",
    messageText
  )

  // 5. Nạp danh mục hoa từ Product Master Index (SSOT)
  const dummyCtx = {
    organizationId,
    workspaceId: "system",
    userId: "customer",
    branchId: null,
    capabilities: new Set<string>(),
  }
  const masterProducts = await listProductMasterIndex(dummyCtx, 30).catch(() => [])

  // 6. Kích hoạt AI Provider để phân tích & trích xuất hoa từ Product Master Index
  const chatProvider = deps.chatProvider ?? new SalesConciergeProvider(chatAnswerViaGateway(dummyCtx, conversationId))
  const aiOutput = await chatProvider.send({
    query: messageText,
    conversationId,
    masterProducts,
  })

  // 7. Lưu tin nhắn phản hồi của Assistant
  await deps.channelRepo.saveChannelMessage(
    organizationId,
    conversationId,
    "ASSISTANT",
    aiOutput.replyText,
    {
      suggestedProducts: aiOutput.suggestedProducts || [],
    }
  )

  return {
    replyText: aiOutput.replyText,
    suggestedProducts: aiOutput.suggestedProducts || [],
    conversationId,
    channel,
  }
}
