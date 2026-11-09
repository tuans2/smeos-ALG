/**
 * IInternalChatRepository — Port Interface cho quản lý Chat Nội Bộ.
 *
 * Đặt tại domain/repositories/ theo chuẩn Clean Architecture (Zero ORM).
 */

import type {
  InternalChatConversation,
  InternalChatParticipant,
  InternalChatMessage,
  ConversationType,
} from "../chat-entities"
import type { MessageCursor } from "../message-cursor"

export interface CreateConversationParams {
  organizationId: string
  conversationType: ConversationType
  title?: string | undefined
  orderId?: string | undefined
  createdBy: string
  participantUserIds: { userId: string; organizationId: string; roleInChat?: string | undefined }[]
  metadata?: Record<string, unknown> | undefined
}

export interface ListConversationsFilter {
  userId: string
  organizationId: string
  conversationType?: ConversationType | undefined
  orderId?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export interface SendMessageParams {
  conversationId: string
  senderUserId: string
  senderRole: string
  messageType?: string | undefined
  content: string
  attachments?: string[] | undefined
  actionPayload?: Record<string, unknown> | undefined
}

export interface MessagePage {
  /** Cũ → mới (đúng thứ tự hiển thị). */
  items: InternalChatMessage[]
  /** Còn tin cũ hơn → con trỏ của tin cũ nhất trong trang; hết → null. */
  nextCursor: MessageCursor | null
}

export interface IInternalChatRepository {
  createConversation(params: CreateConversationParams): Promise<InternalChatConversation>
  findConversationById(conversationId: string): Promise<InternalChatConversation | null>
  /** Luồng theo đơn của ĐÚNG tổ chức chủ đơn — không tra chéo tổ chức (tổ chức khác có thể gắn trùng mã đơn). */
  findConversationByOrderId(organizationId: string, orderId: string): Promise<InternalChatConversation | null>
  /** Phòng cùng tổ chức, cùng loại, không gắn đơn, có đủ cả hai người — để không tạo phòng trùng. */
  findDirectConversation(organizationId: string, conversationType: ConversationType, userIds: [string, string]): Promise<InternalChatConversation | null>
  /**
   * Phòng người dùng đang tham gia trong ngữ cảnh tổ chức hiện tại: phòng của chính tổ chức, hoặc phòng của tổ chức
   * có liên kết chuỗi–đối tác ACTIVE với tổ chức hiện tại. `unreadCount` = số tin của người khác sau `last_read_at`.
   */
  listConversations(filter: ListConversationsFilter): Promise<{ items: InternalChatConversation[]; total: number }>
  getParticipants(conversationId: string): Promise<InternalChatParticipant[]>
  isParticipant(conversationId: string, userId: string): Promise<boolean>
  addParticipant(conversationId: string, participant: { userId: string; organizationId: string; roleInChat?: string | undefined }): Promise<void>
  sendMessage(params: SendMessageParams): Promise<InternalChatMessage>
  findMessageById(messageId: string): Promise<InternalChatMessage | null>
  /** Trang tin mới nhất (hoặc cũ hơn `before`), tối đa `limit` (trần 100). */
  listMessages(conversationId: string, limit?: number | undefined, before?: MessageCursor | undefined): Promise<MessagePage>
  markRead(conversationId: string, userId: string): Promise<void>
  /**
   * Gộp `patch` vào `action_payload` chỉ khi thẻ còn ở trạng thái `expectedStatus` (một câu lệnh có điều kiện) —
   * hai người bấm cùng lúc thì chỉ một người thắng. Không khớp → null.
   */
  updateCardIfStatus(messageId: string, expectedStatus: string, patch: Record<string, unknown>): Promise<InternalChatMessage | null>
}

/** Liên kết chuỗi–đối tác (chiều nào cũng được) còn ACTIVE giữa hai tổ chức. */
export interface IChatLinkPolicy {
  hasActiveLink(organizationIdA: string, organizationIdB: string): Promise<boolean>
}
