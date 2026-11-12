import { z } from "zod"

import { order } from "./responses-orders"

/**
 * Phản hồi `/api/v1/chat/*` và `/api/v1/internal-chat/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của
 * `chat-assistant` và `internal-chat` rồi kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-chat.test.ts`.
 * Hình dạng giữ nguyên như route trả hôm nay — gồm cả `{ success: true, data }` cũ của chat nội bộ (route có trong
 * `api-envelope-legacy.txt`). Mọi khoá bí mật của kênh đã che `••••` + 4 ký tự cuối.
 */
const timestamp = z.iso.datetime()
const CHANNEL = z.enum(["INTERNAL_DASHBOARD", "STOREFRONT_CATALOG", "LANDING_PAGE", "FACEBOOK_MESSENGER", "ZALO_OA", "EMBEDDED_WIDGET"])

const channelConfig = z.strictObject({
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
  publicSurfaces: z.array(z.string()).optional(),
  publicChatLimits: z.strictObject({ perVisitor: z.number(), perIp: z.number(), approvedAt: z.string() }).optional(),
})

const channelStatus = z.strictObject({
  channel: CHANNEL,
  pricing: z.strictObject({
    channel: CHANNEL,
    name: z.string(),
    description: z.string(),
    isFree: z.boolean(),
    monthlyCreditCost: z.number(),
    messageCreditCost: z.number(),
    requiresSetup: z.boolean(),
    guideUrl: z.string().optional(),
  }),
  isEnabled: z.boolean(),
  isSubscriptionActive: z.boolean(),
  subscriptionExpiresAt: z.string().nullable(),
  config: channelConfig,
})
/** `embedSnippet`: mã nhúng dựng từ slug của tiệm; `null` khi tiệm chưa có slug hoặc chưa cấu hình URL ứng dụng. */
export const chatChannelsResponse = z.strictObject({ channels: z.array(channelStatus), embedSnippet: z.string().nullable() })
export const chatChannelConfiguredResponse = z.strictObject({
  channel: z.strictObject({
    id: z.string(),
    organizationId: z.string(),
    channel: CHANNEL,
    isEnabled: z.boolean(),
    config: channelConfig,
    subscriptionExpiresAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
})

const conversation = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  customerId: z.string().optional(),
  title: z.string(),
  channel: z.enum(["WEB_WIDGET", "INTERNAL_DASHBOARD", "ZALO"]),
  status: z.enum(["ACTIVE", "CLOSED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const chatConversationsResponse = z.strictObject({ items: z.array(conversation), count: z.number() })
export const chatConversationResponse = z.strictObject({ conversation })

const productCard = z.strictObject({
  productId: z.string(),
  productCode: z.string(),
  productName: z.string(),
  sampleImageUrl: z.string().optional(),
  priceVnd: z.number().nullable(),
  category: z.string(),
  wrapStyle: z.string(),
  reason: z.string(),
})
const message = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  conversationId: z.string(),
  senderType: z.enum(["USER", "ASSISTANT", "SYSTEM"]),
  content: z.string(),
  metadata: z
    .strictObject({
      suggestedProducts: z.array(productCard).optional(),
      suggestedFlowers: z.array(productCard).optional(),
      createdOrderId: z.string().optional(),
      orderCode: z.string().optional(),
      userIntent: z.string().optional(),
      targetRoute: z.string().optional(),
      actionLabel: z.string().optional(),
      actionSteps: z.array(z.string()).optional(),
      assistantType: z.enum(["OPS_COPILOT", "SALES_CONCIERGE"]).optional(),
    })
    .optional(),
  createdAt: z.string(),
})
export const chatMessagesResponse = z.strictObject({ messages: z.array(message) })
export const chatSendMessageResponse = z.strictObject({ userMessage: message, assistantMessage: message })
export const chatCreateOrderResponse = z.strictObject({ order })

const pendingLimit = z.strictObject({
  per_visitor: z.number(),
  per_ip: z.number(),
  requested_at: z.string(),
  requested_by: z.string(),
  note: z.string().nullable(),
})
export const publicChatLimitsResponse = z.strictObject({
  current: z.strictObject({ perVisitor: z.number(), perIp: z.number(), windowMs: z.number() }),
  pending: pendingLimit.nullable(),
})
export const publicChatLimitRequestedResponse = z.strictObject({ pending: pendingLimit })

export const publicChatWidgetResponse = z.strictObject({
  data: z.strictObject({
    replyText: z.string(),
    suggestedProducts: z.array(productCard),
    conversationId: z.string(),
    channel: CHANNEL,
  }),
})

// ── Chat nội bộ ─────────────────────────────────────────────────────────────
const internalConversation = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  conversationType: z.enum(["PLATFORM_TENANT", "CHAIN_PARTNER", "CHAIN_BRANCH", "ORDER_THREAD"]),
  title: z.string().nullable(),
  orderId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  /** Bên kia của phòng liên tổ chức (cửa hàng đối tác); null = phòng trong một tổ chức */
  counterpartOrgId: z.string().nullable().optional(),
  /** Phòng chi nhánh nội bộ (`CHAIN_BRANCH`) */
  branchId: z.string().nullable().optional(),
  createdBy: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
  lastMessageAt: timestamp,
  unreadCount: z.number().optional(),
  lastMessageSnippet: z.string().optional(),
  counterpartName: z.string().optional(),
  isMuted: z.boolean().optional(),
  activeOrderCount: z.number().optional(),
})
const internalMessage = z.strictObject({
  id: z.string(),
  conversationId: z.string(),
  senderUserId: z.string(),
  senderRole: z.string(),
  senderName: z.string().optional(),
  messageType: z.enum(["TEXT", "IMAGE", "ACTION_CARD_ORDER", "ACTION_CARD_QC", "ACTION_CARD_SUBCONTRACT", "SYSTEM_NOTICE"]),
  content: z.string(),
  attachments: z.array(z.string()),
  actionPayload: z.record(z.string(), z.unknown()),
  isDeleted: z.boolean(),
  createdAt: timestamp,
  /** Người xem là người gửi và còn trong 24 giờ — được sửa / thu hồi */
  canChange: z.boolean().optional(),
  /** Thời điểm sửa gần nhất (ISO) */
  editedAt: z.string().optional(),
  /** Chỉ thẻ `ACTION_CARD_SUBCONTRACT`: trạng thái tính lúc đọc theo góc nhìn người xem */
  subcontractView: z.strictObject({
    stage: z.string(),
    closedReason: z.string().nullable(),
    deadlineAt: z.string().nullable(),
    productionStatus: z.string().nullable(),
    deliveryStatus: z.string().nullable(),
    actionUrl: z.string().nullable(),
  }).optional(),
})
export const internalConversationsResponse = z.strictObject({ data: z.array(internalConversation), meta: z.strictObject({ total: z.number() }) })
export const internalConversationResponse = z.strictObject({ data: internalConversation })
export const internalMessagesResponse = z.strictObject({
  data: z.array(internalMessage),
  /** Con trỏ trang cũ hơn (`?before=`); null = hết */
  next_cursor: z.string().nullable(),
})
export const internalMessageResponse = z.strictObject({ data: internalMessage })
/** Route `defineRoute` mới (GĐ7–8, sửa / thu hồi) trả envelope chuẩn `{ data }`. */
export const internalMessageDataResponse = z.strictObject({ data: internalMessage })
export const internalMessageDeletedResponse = z.strictObject({ data: z.strictObject({ id: z.string(), deleted: z.literal(true) }) })
export const internalMuteResponse = z.strictObject({ data: z.strictObject({ muted: z.boolean() }) })
export const internalUnreadResponse = z.strictObject({ data: z.strictObject({ unread_count: z.number() }) })
export const internalChatStatsResponse = z.strictObject({
  data: z.strictObject({ days: z.number(), invites_in_chat: z.number(), partner_claims: z.number(), partner_stores: z.number() }),
})

/** Webhook trả cho nhà cung cấp — không phải envelope `{ data }`. */
export const facebookWebhookResponse = z.strictObject({ status: z.enum(["EVENT_RECEIVED", "ignored", "ok"]) })
export const zaloWebhookResponse = z.strictObject({ error: z.literal(0), message: z.string() })
