import type { IChatLinkPolicy, IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatConversation } from "../domain/chat-entities"
import { ChatAccessDeniedError, ConversationNotFoundError } from "../domain/errors"

export interface ChatCaller {
  userId: string
  organizationId: string
}

/**
 * Cổng chung của đọc / gửi / bấm thẻ: người gọi phải là thành viên phòng; nếu phòng thuộc tổ chức khác thì liên kết
 * chuỗi–đối tác giữa hai tổ chức phải còn ACTIVE (đối tác bị tạm dừng / chấm dứt → như không tồn tại). Mọi trường
 * hợp sai đều 404 — không xác nhận phòng có tồn tại.
 */
export async function assertConversationAccess(
  chatRepo: IInternalChatRepository,
  linkPolicy: IChatLinkPolicy,
  conversationId: string,
  caller: ChatCaller
): Promise<InternalChatConversation> {
  const conv = await chatRepo.findConversationById(conversationId)
  if (!conv) throw new ConversationNotFoundError(conversationId)
  if (!(await chatRepo.isParticipant(conversationId, caller.userId))) throw new ChatAccessDeniedError()
  if (conv.organizationId !== caller.organizationId && !(await linkPolicy.hasActiveLink(conv.organizationId, caller.organizationId))) {
    throw new ChatAccessDeniedError()
  }
  return conv
}
