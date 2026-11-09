import type { IChatLinkPolicy, IInternalChatRepository, MessagePage } from "../domain/chat-repository.interface"
import { CHAT_PAGE_DEFAULT_LIMIT, CHAT_PAGE_MAX_LIMIT } from "../domain/chat-limits"
import type { MessageCursor } from "../domain/message-cursor"
import type { InternalChatConversation, InternalChatMessage } from "../domain/chat-entities"
import { assertConversationAccess, type ChatCaller } from "./conversation-access"

/** Bổ sung cho trang tin sau khi đã kiểm quyền phòng (vd. trạng thái thật của thẻ đơn gia công). */
export type MessagePageDecorator = (items: InternalChatMessage[], conversation: InternalChatConversation, caller: ChatCaller) => Promise<InternalChatMessage[]>

/** Chạy lần lượt nhiều bộ bổ sung (thẻ đơn gia công, ảnh). */
export function composeDecorators(...decorators: MessagePageDecorator[]): MessagePageDecorator {
  return async (items, conversation, caller) => {
    let out = items
    for (const decorate of decorators) out = await decorate(out, conversation, caller)
    return out
  }
}

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
    private readonly linkPolicy: IChatLinkPolicy,
    private readonly decorate?: MessagePageDecorator | undefined
  ) {}

  async execute(input: GetConversationMessagesInput): Promise<MessagePage> {
    const conversation = await assertConversationAccess(this.chatRepo, this.linkPolicy, input.conversationId, input, "READ")

    const limit = Math.min(Math.max(input.limit ?? CHAT_PAGE_DEFAULT_LIMIT, 1), CHAT_PAGE_MAX_LIMIT)
    const page = await this.chatRepo.listMessages(input.conversationId, limit, input.before)
    // Chỉ trang mới nhất mới đánh dấu đã đọc — kéo xem tin cũ không làm mất số chưa đọc
    if (!input.before) await this.chatRepo.markRead(input.conversationId, input.userId, input.organizationId)
    return this.decorate ? { ...page, items: await this.decorate(page.items, conversation, input) } : page
  }
}
