import type { IChatLinkPolicy, IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatMessage } from "../domain/chat-entities"
import { CHAT_MESSAGE_MAX_LENGTH } from "../domain/chat-limits"
import { InvalidMessageContentError } from "../domain/errors"
import { assertConversationAccess } from "./conversation-access"

export interface SendChatMessageInput {
  conversationId: string
  userId: string
  organizationId: string
  branchId?: string | null | undefined
  userRole: string
  content: string
}

/**
 * Người dùng gửi tin chữ. Thẻ đơn và tin hệ thống KHÔNG đi đường này — chỉ use-case máy chủ
 * (`DispatchOrderToChatUseCase`, `HandleCardActionUseCase`) sinh ra, để client không giả được thẻ / thông báo.
 */
export class SendChatMessageUseCase {
  constructor(
    private readonly chatRepo: IInternalChatRepository,
    private readonly linkPolicy: IChatLinkPolicy
  ) {}

  async execute(input: SendChatMessageInput): Promise<InternalChatMessage> {
    await assertConversationAccess(this.chatRepo, this.linkPolicy, input.conversationId, input)

    const trimmed = input.content.trim()
    if (!trimmed) throw new InvalidMessageContentError("Tin nhắn không được để trống")
    if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new InvalidMessageContentError(`Tin nhắn dài quá ${CHAT_MESSAGE_MAX_LENGTH} ký tự`)
    }

    return this.chatRepo.sendMessage({
      conversationId: input.conversationId,
      senderUserId: input.userId,
      senderRole: input.userRole,
      messageType: "TEXT",
      content: trimmed,
    })
  }
}
