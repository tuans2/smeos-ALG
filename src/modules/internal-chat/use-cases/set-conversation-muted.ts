import type { IChatLinkPolicy, IInternalChatRepository } from "../domain/chat-repository.interface"
import { assertConversationAccess, type ChatCaller } from "./conversation-access"

/**
 * Tắt / bật tiếng một phòng cho chính người gọi (IC-7.3): không nhận thông báo "tin nhắn mới" của phòng đó. Thẻ mời
 * nhận đơn gia công vẫn báo — có hạn nhận, bỏ lỡ là mất đơn. Ai xem được phòng (kể cả chỉ đọc) đều tắt tiếng được.
 */
export async function setConversationMuted(
  deps: { chatRepo: IInternalChatRepository; linkPolicy: IChatLinkPolicy },
  input: { conversationId: string; caller: ChatCaller; muted: boolean }
): Promise<{ muted: boolean }> {
  await assertConversationAccess(deps.chatRepo, deps.linkPolicy, input.conversationId, input.caller, "READ")
  await deps.chatRepo.setMuted(input.conversationId, input.caller.userId, input.caller.organizationId, input.muted)
  return { muted: input.muted }
}
