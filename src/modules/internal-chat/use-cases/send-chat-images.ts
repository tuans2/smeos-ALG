import { randomUUID } from "node:crypto"
import type { StorageProvider } from "@/core/ports/storage-provider"
import { buildStorageKey } from "@/modules/assets/domain/storage-key"
import type { IChatLinkPolicy, IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatMessage } from "../domain/chat-entities"
import { CHAT_MESSAGE_MAX_LENGTH } from "../domain/chat-limits"
import { chatImageFolder, checkChatImage, MAX_CHAT_IMAGES_PER_MESSAGE } from "../domain/chat-image"
import { ChatImageTooLargeError, InvalidMessageContentError } from "../domain/errors"
import type { IChatNotifier } from "./chat-notifier"
import { assertConversationAccess, type ChatCaller } from "./conversation-access"

export interface SendChatImagesInput {
  conversationId: string
  caller: ChatCaller
  userRole: string
  caption: string
  files: Uint8Array[]
}

export interface SendChatImagesDeps {
  chatRepo: IInternalChatRepository
  linkPolicy: IChatLinkPolicy
  storage: Pick<StorageProvider, "put">
  notifier?: IChatNotifier | undefined
  newId?: (() => string) | undefined
}

/**
 * Gửi 1–5 ảnh (kèm chú thích) trong một tin (GĐ8). Kiểm quyền gửi vào phòng và kiểm MỌI tệp trước khi ghi tệp nào —
 * tệp sai thì không có gì lên kho. Tải lên và tạo tin trong cùng một yêu cầu nên không có tệp chờ "gắn sau" bị bỏ quên.
 * Khoá thuộc tổ chức chủ phòng (nguồn registry `internal_chat_messages.attachments`).
 */
export async function sendChatImages(deps: SendChatImagesDeps, input: SendChatImagesInput): Promise<InternalChatMessage> {
  const conversation = await assertConversationAccess(deps.chatRepo, deps.linkPolicy, input.conversationId, input.caller)

  if (input.files.length === 0) throw new InvalidMessageContentError("Chọn ít nhất một ảnh")
  if (input.files.length > MAX_CHAT_IMAGES_PER_MESSAGE) throw new InvalidMessageContentError(`Mỗi tin gửi tối đa ${MAX_CHAT_IMAGES_PER_MESSAGE} ảnh`)
  const caption = input.caption.trim()
  if (caption.length > CHAT_MESSAGE_MAX_LENGTH) throw new InvalidMessageContentError(`Chú thích dài quá ${CHAT_MESSAGE_MAX_LENGTH} ký tự`)

  const checked = input.files.map((bytes) => ({ bytes, check: checkChatImage(bytes) }))
  for (const { check } of checked) {
    if (check.ok) continue
    if (check.reason === "too_large") throw new ChatImageTooLargeError()
    throw new InvalidMessageContentError(check.reason === "empty" ? "Có ảnh bị rỗng" : "Chỉ gửi được ảnh JPG, PNG hoặc WebP")
  }

  const newId = deps.newId ?? randomUUID
  const keys: string[] = []
  for (const { bytes, check } of checked) {
    if (!check.ok) continue
    const key = buildStorageKey({ organizationId: conversation.organizationId, productId: chatImageFolder(conversation.id), assetId: newId(), extension: check.ext })
    await deps.storage.put(key, bytes, check.contentType)
    keys.push(key)
  }

  const message = await deps.chatRepo.sendMessage({
    conversationId: conversation.id,
    senderUserId: input.caller.userId,
    senderRole: input.userRole,
    messageType: "IMAGE",
    content: caption,
    attachments: keys,
  })
  await deps.notifier?.messageReceived({ conversation, senderOrgId: input.caller.organizationId, preview: caption || `Đã gửi ${keys.length} ảnh` })
  return message
}
