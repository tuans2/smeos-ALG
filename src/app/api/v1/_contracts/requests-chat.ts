import { z } from "zod"

import { PUBLIC_CHAT_SURFACES } from "@/modules/chat-assistant/domain/public-chat-policy"
import { CARD_REJECT_REASON_MAX_LENGTH, CHAT_MESSAGE_MAX_LENGTH, CLIENT_CREATABLE_CONVERSATION_TYPES } from "@/modules/internal-chat/domain/chat-limits"

/**
 * Lược đồ yêu cầu của `/api/v1/chat/*` (trợ lý AI đa kênh) và `/api/v1/internal-chat/*` (chat nội bộ giữa tiệm, chuỗi,
 * đối tác) — OpenAPI nội bộ, PO 07/11/2026. Lược đồ từng khai trong 6 route được chuyển NGUYÊN VĂN về đây và route
 * import lại. Phần "chỉ mô tả" ghi đúng trường mà route tự đọc (không kiểm bằng zod) — route không import chúng.
 */

// chat/channels/route.ts
export const configureChatChannelBody = z.object({
  channel: z.enum([
    "INTERNAL_DASHBOARD",
    "STOREFRONT_CATALOG",
    "LANDING_PAGE",
    "FACEBOOK_MESSENGER",
    "ZALO_OA",
    "EMBEDDED_WIDGET",
  ]),
  is_enabled: z.boolean(),
  /** Cấu hình kênh — giữ tên trường như `GET /chat/channels` trả về (đọc/ghi cùng một đối tượng, D-69). */
  config: z
    .object({
      welcomeMessage: z.string().optional(),
      avatarUrl: z.string().optional(),
      botName: z.string().optional(),
      fbPageId: z.string().optional(),
      fbPageAccessToken: z.string().optional(),
      fbVerifyToken: z.string().optional(),
      zaloOaId: z.string().optional(),
      zaloAppId: z.string().optional(),
      zaloSecretKey: z.string().optional(),
      zaloAccessToken: z.string().optional(),
      zaloRefreshToken: z.string().optional(),
      embedAllowedOrigins: z.array(z.string()).optional(),
      publicSurfaces: z.array(z.enum(PUBLIC_CHAT_SURFACES)).optional(),
    })
    .optional(),
})

// chat/public-limits/route.ts
export const publicChatLimitRequestBody = z.object({
  per_visitor: z.number().int().positive(),
  per_ip: z.number().int().positive(),
  note: z.string().trim().max(500).nullish(),
})

// chat/public/widget/route.ts
export const publicChatWidgetBody = z.object({
  slug: z.string().min(1).max(120),
  surface: z.enum(PUBLIC_CHAT_SURFACES).default("catalog"),
  visitorId: z.string().min(1).max(64),
  message: z.string().trim().min(1).max(2000),
})

// internal-chat/conversations/route.ts — nút "Nhắn tin": mở phòng của đúng một cặp (chuỗi ↔ cửa hàng đối tác,
// hoặc chi nhánh nội bộ) — IC-2.6. Thân không khớp thì route thử lược đồ tạo hội thoại bên dưới.
export const openInternalRoomBody = z.union([
  z.object({ partner_org_id: z.string().uuid() }).strict(),
  z.object({ chain_org_id: z.string().uuid() }).strict(),
  z.object({ branch_id: z.string().uuid() }).strict(),
])

export const createInternalConversationBody = z.object({
  // `PLATFORM_TENANT` (Nền tảng ↔ khách) không cho client tự tạo
  conversation_type: z.enum(CLIENT_CREATABLE_CONVERSATION_TYPES),
  title: z.string().trim().max(200).optional(),
  target_organization_id: z.string().uuid().optional(),
  target_user_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
})

// internal-chat/conversations/[id]/messages/route.ts
/**
 * Client chỉ gửi tin chữ. `.strict()`: thân có `actionPayload` / `attachments` / loại khác `TEXT` → 400 — thẻ đơn
 * và tin hệ thống chỉ do use-case máy chủ sinh (trước đây client tự gửi được `SYSTEM_NOTICE` với payload tuỳ ý).
 */
export const sendInternalMessageBody = z
  .object({
    content: z.string().max(CHAT_MESSAGE_MAX_LENGTH, `Tin nhắn tối đa ${CHAT_MESSAGE_MAX_LENGTH} ký tự`),
    message_type: z.literal("TEXT").optional(),
  })
  .strict()

// internal-chat/messages/[id]/action/route.ts
export const internalCardActionBody = z.object({
  action: z.enum(["ACCEPT_ORDER", "REJECT_ORDER"]),
  rejected_reason: z.string().max(CARD_REJECT_REASON_MAX_LENGTH, `Lý do tối đa ${CARD_REJECT_REASON_MAX_LENGTH} ký tự`).optional(),
})

// internal-chat/messages/[id]/route.ts (PATCH) — sửa tin chữ / chú thích ảnh của chính mình
export const editInternalMessageBody = z.object({ content: z.string().max(CHAT_MESSAGE_MAX_LENGTH, `Tin nhắn tối đa ${CHAT_MESSAGE_MAX_LENGTH} ký tự`) }).strict()

// internal-chat/conversations/[id]/mute/route.ts
export const muteInternalConversationBody = z.object({ muted: z.boolean() }).strict()

// ── Chỉ mô tả — route tự đọc ────────────────────────────────────────────────
const int = z.string().regex(/^-?\d+$/)

/** `chat/conversations` POST: trường vắng dùng mặc định ("Hội thoại tư vấn hoa", `WEB_WIDGET`). */
export const createChatConversationBody = z.object({
  title: z.string().optional(),
  channel: z.enum(["WEB_WIDGET", "INTERNAL_DASHBOARD", "ZALO"]).optional(),
  customerId: z.string().optional(),
})

/** `chat/conversations/[id]/messages` POST: câu hỏi ở `query` (hoặc `content`). */
export const sendChatMessageBody = z.object({
  query: z.string().optional(),
  content: z.string().optional(),
  assistantType: z.enum(["OPS_COPILOT", "SALES_CONCIERGE"]).optional(),
})

/** `chat/conversations/[id]/create-order` POST: thiếu `productId` → 400. */
export const chatCreateOrderBody = z.object({
  productId: z.string(),
  recipientName: z.string().optional(),
  phone: z.string().optional(),
  street: z.string().optional(),
  cardMessage: z.string().optional(),
})

export const chatConversationsQuery = z.object({ status: z.string().optional(), limit: int.optional() })
export const internalConversationsQuery = z.object({
  type: z.enum(["PLATFORM_TENANT", "CHAIN_PARTNER", "CHAIN_BRANCH", "ORDER_THREAD"]).optional(),
  orderId: z.string().optional(),
})
export const facebookVerifyQuery = z.object({
  "hub.mode": z.string().optional(),
  "hub.verify_token": z.string().optional(),
  "hub.challenge": z.string().optional(),
})

/** POST /internal-chat/conversations/{id}/images — multipart: 1–5 ảnh ở trường `files`, chú thích `caption`. */
export const internalChatImagesForm = z.object({
  files: z.array(z.file()),
  caption: z.string().optional(),
})
