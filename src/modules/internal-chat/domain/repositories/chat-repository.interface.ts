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
import type { LinkState } from "../conversation-access-policy"

export interface CreateConversationParams {
  organizationId: string
  conversationType: ConversationType
  title?: string | undefined
  orderId?: string | undefined
  createdBy: string
  participantUserIds: { userId: string; organizationId: string; roleInChat?: string | undefined }[]
  metadata?: Record<string, unknown> | undefined
  /** Bên kia của phòng liên tổ chức (cửa hàng đối tác) — RLS cho tổ chức này thấy phòng */
  counterpartOrgId?: string | undefined
  /** Phòng chi nhánh nội bộ */
  branchId?: string | undefined
  /** Khoá chống trùng trong tổ chức (`partner:<id>` / `branch:<id>`) */
  roomKey?: string | undefined
}

export interface ListConversationsFilter {
  userId: string
  organizationId: string
  /** `memberships.branch_id` của người xem — null = toàn tổ chức */
  branchId?: string | null | undefined
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
  /** Phòng theo khoá chống trùng của tổ chức chủ phòng. */
  findConversationByRoomKey(organizationId: string, roomKey: string): Promise<InternalChatConversation | null>
  /** Phòng cùng tổ chức, cùng loại, không gắn đơn, có đủ cả hai người — để không tạo phòng trùng. */
  findDirectConversation(organizationId: string, conversationType: ConversationType, userIds: [string, string]): Promise<InternalChatConversation | null>
  /**
   * Phòng trong phạm vi người xem (D1): phòng của chính tổ chức (phòng chi nhánh chỉ khi đúng chi nhánh hoặc toàn tổ
   * chức), phòng chuỗi có tổ chức này là bên kia với liên kết ACTIVE / SUSPENDED, và phòng cũ người xem là thành viên
   * với liên kết ACTIVE. `unreadCount` = số tin của người khác sau `last_read_at` (chưa mở lần nào = mọi tin).
   */
  listConversations(filter: ListConversationsFilter): Promise<{ items: InternalChatConversation[]; total: number }>
  getParticipants(conversationId: string): Promise<InternalChatParticipant[]>
  isParticipant(conversationId: string, userId: string): Promise<boolean>
  addParticipant(conversationId: string, participant: { userId: string; organizationId: string; roleInChat?: string | undefined }): Promise<void>
  sendMessage(params: SendMessageParams): Promise<InternalChatMessage>
  findMessageById(messageId: string): Promise<InternalChatMessage | null>
  /** Trang tin mới nhất (hoặc cũ hơn `before`), tối đa `limit` (trần 100). */
  listMessages(conversationId: string, limit?: number | undefined, before?: MessageCursor | undefined): Promise<MessagePage>
  /** Đánh dấu đã đọc; chưa có dòng thành viên (vào theo tổ chức, D1) thì tạo với tổ chức của người đọc. */
  markRead(conversationId: string, userId: string, organizationId: string): Promise<void>
  /**
   * Gộp `patch` vào `action_payload` chỉ khi thẻ còn ở trạng thái `expectedStatus` (một câu lệnh có điều kiện) —
   * hai người bấm cùng lúc thì chỉ một người thắng. Không khớp → null.
   */
  updateCardIfStatus(messageId: string, expectedStatus: string, patch: Record<string, unknown>): Promise<InternalChatMessage | null>
}

/** Liên kết chuỗi–đối tác giữa hai tổ chức. */
export interface IChatLinkPolicy {
  /** Chiều nào cũng được, còn ACTIVE. */
  hasActiveLink(organizationIdA: string, organizationIdB: string): Promise<boolean>
  /** Trạng thái liên kết chuỗi `chainOrgId` → cửa hàng `partnerOrgId`. */
  linkState(chainOrgId: string, partnerOrgId: string): Promise<LinkState>
}
