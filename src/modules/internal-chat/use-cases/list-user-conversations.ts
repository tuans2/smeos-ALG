import type { IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatConversation, ConversationType } from "../domain/chat-entities"

export interface ListUserConversationsInput {
  userId: string
  organizationId: string
  branchId?: string | null | undefined
  conversationType?: ConversationType | undefined
  orderId?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}


export class ListUserConversationsUseCase {
  constructor(private readonly chatRepo: IInternalChatRepository) {}

  async execute(input: ListUserConversationsInput): Promise<{ items: InternalChatConversation[]; total: number }> {
    return this.chatRepo.listConversations({
      userId: input.userId,
      organizationId: input.organizationId,
      branchId: input.branchId,
      conversationType: input.conversationType,
      orderId: input.orderId,
      limit: input.limit ?? 20,
      offset: input.offset ?? 0,
    })
  }
}
