import { getInternalChatRepository } from "./prisma-chat-repository"
import { PrismaChatRoomDirectory } from "./prisma-chat-room-directory"
import { OrganizationChatNotifier } from "./chat-notifier"
import { postSubcontractMessage, type PostSubcontractMessageInput } from "../use-cases/post-subcontract-message"

/**
 * Điểm nối cho bộ gửi lời mời của Thẻ Chào (`greeting-card/infra/dispatch-notification-adapter.ts`), nạp động để hai
 * module không vòng phụ thuộc lúc nạp. Lỗi được ném lên để bên gọi ghi log và vẫn gửi Telegram / Zalo bình thường.
 */
export function postSubcontractMessageToChat(input: PostSubcontractMessageInput): Promise<boolean> {
  return postSubcontractMessage(getInternalChatRepository(), new PrismaChatRoomDirectory(), input, new OrganizationChatNotifier())
}
