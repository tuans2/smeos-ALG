import type { IChatLinkPolicy, IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatMessage } from "../domain/chat-entities"
import { isRoomImageKey } from "../domain/chat-image"
import { CHAT_MESSAGE_MAX_LENGTH } from "../domain/chat-limits"
import { checkMessageChange } from "../domain/message-change-policy"
import { ChatAccessDeniedError, InvalidMessageContentError, MessageChangeNotAllowedError } from "../domain/errors"
import { assertConversationAccess, type ChatCaller } from "./conversation-access"
import type { MessagePageDecorator } from "./get-conversation-messages"

type Deps = { chatRepo: IInternalChatRepository; linkPolicy: IChatLinkPolicy; now?: (() => Date) | undefined }

const TOO_LATE = "Đã quá 24 giờ kể từ lúc gửi — không sửa hoặc thu hồi được nữa"

/** Nạp tin + kiểm quyền gửi vào phòng + luật đổi tin. Tin của người khác / ngoài phòng → 404; không đổi được → 409. */
async function loadChangeable(deps: Deps, messageId: string, caller: ChatCaller) {
  const message = await deps.chatRepo.findMessageById(messageId)
  if (!message) throw new ChatAccessDeniedError()
  const conversation = await assertConversationAccess(deps.chatRepo, deps.linkPolicy, message.conversationId, caller)
  const check = checkMessageChange(message, caller.userId, (deps.now ?? (() => new Date()))())
  if (!check.ok) {
    if (check.reason === "NOT_OWNER") throw new ChatAccessDeniedError()
    throw new MessageChangeNotAllowedError(check.reason === "TOO_LATE" ? TOO_LATE : undefined)
  }
  return { message, conversation }
}

/** Người gửi sửa tin chữ / chú thích ảnh của mình trong 24 giờ. Tin chữ không được để trống. */
export async function editChatMessage(deps: Deps, input: { messageId: string; caller: ChatCaller; content: string }): Promise<InternalChatMessage> {
  const { message } = await loadChangeable(deps, input.messageId, input.caller)
  const content = input.content.trim()
  if (message.messageType === "TEXT" && !content) throw new InvalidMessageContentError("Tin nhắn không được để trống")
  if (content.length > CHAT_MESSAGE_MAX_LENGTH) throw new InvalidMessageContentError(`Tin nhắn dài quá ${CHAT_MESSAGE_MAX_LENGTH} ký tự`)
  const updated = await deps.chatRepo.editMessage(message.id, content, (deps.now ?? (() => new Date()))())
  if (!updated) throw new MessageChangeNotAllowedError()
  return updated
}

/**
 * Người gửi thu hồi tin của mình trong 24 giờ: nội dung và ảnh bị xoá khỏi phòng (còn dòng "đã thu hồi"); tệp ảnh
 * — chỉ khoá đúng thư mục ảnh của phòng — vào hàng đợi xoá của kho.
 */
export async function deleteChatMessage(
  deps: Deps,
  input: { messageId: string; caller: ChatCaller }
): Promise<{ messageType: string; imageCount: number }> {
  const { message, conversation } = await loadChangeable(deps, input.messageId, input.caller)
  const keys = message.messageType === "IMAGE" ? message.attachments.filter((k) => isRoomImageKey(k, conversation)) : []
  const ok = await deps.chatRepo.deleteMessage(message.id, (deps.now ?? (() => new Date()))(), { ownerOrgId: conversation.organizationId, keys })
  if (!ok) throw new MessageChangeNotAllowedError()
  return { messageType: message.messageType, imageCount: keys.length }
}

/** Đánh dấu tin người xem còn được sửa / thu hồi (nút trên giao diện; máy chủ vẫn kiểm lại khi đổi). */
export function changeableDecorator(now: () => Date = () => new Date()): MessagePageDecorator {
  return async (items, _conversation, caller) => {
    const at = now()
    return items.map((m) => (checkMessageChange(m, caller.userId, at).ok ? { ...m, canChange: true } : m))
  }
}
