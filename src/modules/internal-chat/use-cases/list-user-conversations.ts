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

/** Trần số phòng cộng dồn cho số đếm trên menu — danh sách luôn có giới hạn. */
export const UNREAD_ROOM_SCAN_LIMIT = 100

/** Tổng tin chưa đọc trong (tối đa 100) phòng gần nhất của người xem. */
export async function countUnreadMessages(
  chatRepo: IInternalChatRepository,
  viewer: { userId: string; organizationId: string; branchId?: string | null | undefined }
): Promise<number> {
  const { items } = await chatRepo.listConversations({ ...viewer, limit: UNREAD_ROOM_SCAN_LIMIT, offset: 0 })
  return items.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
}
