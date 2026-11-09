import type { SubcontractCardView } from "./subcontract-card"

export type ConversationType = "PLATFORM_TENANT" | "CHAIN_PARTNER" | "CHAIN_BRANCH" | "ORDER_THREAD"

export type ParticipantRoleInChat = "OWNER" | "ADMIN" | "MEMBER" | "GUEST_PARTNER"

export type InternalChatMessageKind =
  | "TEXT"
  | "IMAGE"
  | "ACTION_CARD_ORDER"
  | "ACTION_CARD_QC"
  /** Thẻ đơn gia công phản chiếu trạng thái thật (GĐ4) — `actionPayload` là `SubcontractCardPayload` */
  | "ACTION_CARD_SUBCONTRACT"
  | "SYSTEM_NOTICE"

export interface ActionCardOrderPayload {
  orderId: string
  orderCode: string
  customerName?: string | undefined
  recipientName?: string | undefined
  deliveryTime?: string | undefined
  deliveryAddress?: string | undefined
  priceVnd?: number | undefined
  thumbnailUrl?: string | undefined
  status: "PENDING_ACCEPT" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED"
  assignedPartnerOrgId?: string | undefined
  assignedPartnerName?: string | undefined
  rejectedReason?: string | undefined
}

export interface ActionCardQcPayload {
  orderId: string
  orderCode: string
  photoUrl: string
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED"
  reviewNote?: string | undefined
}

export type ActionPayload = ActionCardOrderPayload | ActionCardQcPayload | Record<string, unknown>

export interface InternalChatConversation {
  id: string
  organizationId: string
  conversationType: ConversationType
  title: string | null
  orderId: string | null
  metadata: Record<string, unknown>
  /** Bên kia của phòng liên tổ chức (cửa hàng đối tác); null = phòng trong một tổ chức */
  counterpartOrgId?: string | null | undefined
  /** Phòng chi nhánh nội bộ (`CHAIN_BRANCH`) */
  branchId?: string | null | undefined
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
  unreadCount?: number | undefined
  lastMessageSnippet?: string | undefined
  /** Tên bên kia theo phía người xem (chuỗi thấy tên cửa hàng, cửa hàng thấy tên chuỗi) */
  counterpartName?: string | undefined
  /** Người xem đã tắt tiếng phòng */
  isMuted?: boolean | undefined
}

export interface InternalChatParticipant {
  id: string
  conversationId: string
  userId: string
  organizationId: string
  roleInChat: ParticipantRoleInChat
  lastReadAt: Date
  isMuted: boolean
  joinedAt: Date
  userName?: string | undefined
  userEmail?: string | undefined
}

export interface InternalChatMessage {
  id: string
  conversationId: string
  senderUserId: string
  senderRole: string
  senderName?: string | undefined
  messageType: InternalChatMessageKind
  content: string
  attachments: string[]
  actionPayload: ActionPayload
  isDeleted: boolean
  createdAt: Date
  /** Chỉ thẻ `ACTION_CARD_SUBCONTRACT`: trạng thái tính lúc đọc theo góc nhìn người xem */
  subcontractView?: SubcontractCardView | undefined
}
