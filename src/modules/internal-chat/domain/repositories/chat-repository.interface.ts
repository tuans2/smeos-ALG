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

export interface IInternalChatRepository {
  createConversation(params: CreateConversationParams): Promise<InternalChatConversation>
  findConversationById(conversationId: string): Promise<InternalChatConversation | null>
  findConversationByOrderId(orderId: string): Promise<InternalChatConversation | null>
  listConversations(filter: ListConversationsFilter): Promise<{ items: InternalChatConversation[]; total: number }>
  getParticipants(conversationId: string): Promise<InternalChatParticipant[]>
  isParticipant(conversationId: string, userId: string): Promise<boolean>
  addParticipant(conversationId: string, participant: { userId: string; organizationId: string; roleInChat?: string | undefined }): Promise<void>
  sendMessage(params: SendMessageParams): Promise<InternalChatMessage>
  listMessages(conversationId: string, limit?: number | undefined, before?: Date | undefined): Promise<InternalChatMessage[]>
  markRead(conversationId: string, userId: string): Promise<void>
  findMessageById(messageId: string): Promise<InternalChatMessage | null>
  updateActionPayload(messageId: string, newPayload: Record<string, unknown>): Promise<InternalChatMessage>
}
