/**
 * AI Chat Assistant & Hội thoại Domain Types (M08).
 */

export type ChatChannel = "WEB_WIDGET" | "INTERNAL_DASHBOARD" | "ZALO"
export type ChatSenderType = "USER" | "ASSISTANT" | "SYSTEM"

export interface SuggestedProductCard {
  productId: string
  productCode: string
  productName: string
  sampleImageUrl?: string | undefined
  /** `null` = sản phẩm chưa có giá bán lẻ cấu hình (nợ #87) — UI phải hiện "liên hệ để báo giá". */
  priceVnd: number | null
  category: string
  wrapStyle: string
  reason: string
}

export interface ChatMessageMetadata {
  suggestedProducts?: SuggestedProductCard[] | undefined
  /** @deprecated Dùng `suggestedProducts` để tương thích đa ngành */
  suggestedFlowers?: SuggestedProductCard[] | undefined
  createdOrderId?: string | undefined
  orderCode?: string | undefined
  userIntent?: string | undefined
  targetRoute?: string | undefined
  actionLabel?: string | undefined
  actionSteps?: string[] | undefined
  assistantType?: "OPS_COPILOT" | "SALES_CONCIERGE" | undefined
}

export interface ChatMessage {
  id: string
  organizationId: string
  conversationId: string
  senderType: ChatSenderType
  content: string
  metadata?: ChatMessageMetadata | undefined
  createdAt: string
}

export interface ChatConversation {
  id: string
  organizationId: string
  customerId?: string | undefined
  title: string
  channel: ChatChannel
  status: "ACTIVE" | "CLOSED"
  createdAt: string
  updatedAt: string
}
