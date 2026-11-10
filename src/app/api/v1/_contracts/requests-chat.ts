import { z } from "zod"

import { PUBLIC_CHAT_SURFACES } from "@/modules/chat-assistant/domain/public-chat-policy"

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
  isEnabled: z.boolean(),
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
  perVisitor: z.number().int().positive(),
  perIp: z.number().int().positive(),
  note: z.string().trim().max(500).nullish(),
})

// chat/public/widget/route.ts
export const publicChatWidgetBody = z.object({
  slug: z.string().min(1).max(120),
  surface: z.enum(PUBLIC_CHAT_SURFACES).default("catalog"),
  visitorId: z.string().min(1).max(64),
  message: z.string().trim().min(1).max(2000),
})

// internal-chat/conversations/route.ts
export const createInternalConversationBody = z.object({
  conversationType: z.enum(["PLATFORM_TENANT", "CHAIN_PARTNER", "ORDER_THREAD"]),
  title: z.string().optional(),
  targetOrganizationId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
})

// internal-chat/conversations/[id]/messages/route.ts
export const sendInternalMessageBody = z.object({
  content: z.string().default(""),
  messageType: z.enum(["TEXT", "IMAGE", "ACTION_CARD_ORDER", "ACTION_CARD_QC", "SYSTEM_NOTICE"]).optional(),
  attachments: z.array(z.string()).optional(),
  actionPayload: z.record(z.string(), z.unknown()).optional(),
})

// internal-chat/messages/[id]/action/route.ts
export const internalCardActionBody = z.object({
  action: z.enum(["ACCEPT_ORDER", "REJECT_ORDER"]),
  rejectedReason: z.string().optional(),
})

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
  type: z.enum(["PLATFORM_TENANT", "CHAIN_PARTNER", "ORDER_THREAD"]).optional(),
  orderId: z.string().optional(),
})
export const facebookVerifyQuery = z.object({
  "hub.mode": z.string().optional(),
  "hub.verify_token": z.string().optional(),
  "hub.challenge": z.string().optional(),
})
