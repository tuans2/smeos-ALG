import type { IChatLinkPolicy, IInternalChatRepository, MessagePage } from "../domain/chat-repository.interface"
import { CHAT_PAGE_DEFAULT_LIMIT, CHAT_PAGE_MAX_LIMIT } from "../domain/chat-limits"
import type { MessageCursor } from "../domain/message-cursor"
import { assertConversationAccess } from "./conversation-access"

export interface GetConversationMessagesInput {
  conversationId: string
  userId: string
  organizationId: string
  branchId?: string | null | undefined
  limit?: number | undefined
  before?: MessageCursor | undefined
}

export class GetConversationMessagesUseCase {
  constructor(
    private readonly chatRepo: IInternalChatRepository,
    private readonly linkPolicy: IChatLinkPolicy
  ) {}

  async execute(input: GetConversationMessagesInput): Promise<MessagePage> {
    await assertConversationAccess(this.chatRepo, this.linkPolicy, input.conversationId, input, "READ")

    const limit = Math.min(Math.max(input.limit ?? CHAT_PAGE_DEFAULT_LIMIT, 1), CHAT_PAGE_MAX_LIMIT)
    const page = await this.chatRepo.listMessages(input.conversationId, limit, input.before)
    // Chỉ trang mới nhất mới đánh dấu đã đọc — kéo xem tin cũ không làm mất số chưa đọc
    if (!input.before) await this.chatRepo.markRead(input.conversationId, input.userId, input.organizationId)
    return page
  }
}
