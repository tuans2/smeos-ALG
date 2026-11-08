import { z } from "zod"

import { NOTIFY_EVENTS } from "@/modules/greeting-card/domain/customer-notifications"
import { MAX_MESSAGE_LENGTH } from "@/modules/greeting-card/domain/internal-message"
import { STAFF_NOTIFY_CHANNELS, STAFF_NOTIFY_EVENTS } from "@/modules/greeting-card/domain/staff-notification-types"
import { PIPELINE_STEPS } from "@/modules/greeting-card/domain/tracking-pipeline-types"

/**
 * Lược đồ yêu cầu của Thẻ chào `/api/v1/greeting-card/*` ngoài đơn hàng (OpenAPI nội bộ, PO 07/11/2026). Lược đồ zod
 * từng khai trong route được chuyển NGUYÊN VĂN về đây và route import lại. Đơn hàng: `requests-greeting-orders.ts`.
 */

// cancellation-requests/[id]/decision/route.ts
export const cancellationDecisionBody = z.object({
  approve: z.boolean(),
  note: z.string().max(1000).optional().default(""),
  actualRefundVnd: z.number().int().nonnegative().max(10_000_000_000).optional(),
})

// cancellation-requests/[id]/follow-up/route.ts
export const cancellationFollowUpBody = z.object({ note: z.string().max(1000).optional().default("") })

// cancellation-requests/route.ts
export const cancellationRequestBody = z.object({
  orderId: z.string().min(1, "Mã đơn hàng không được để trống"),
  type: z.enum(["CANCEL_ONLY", "FULL_REFUND", "PARTIAL_REFUND"]),
  reason: z.string().trim().min(3, "Lý do hủy/hoàn phải có ít nhất 3 ký tự").max(1000),
  refundAmountVnd: z.number().int().nonnegative().max(10_000_000_000).optional().default(0),
  note: z.string().max(1000).optional(),
})

// catalogs/[id]/products/route.ts
export const catalogProductBody = z.object({ productId: z.string().min(1) })

// catalogs/[id]/products/route.ts
export const catalogProductRemoveBody = z.object({ productId: z.string().min(1) })

// catalogs/[id]/route.ts
export const updateCatalogBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  type: z.enum(["STANDARD", "CLIENT"]).optional(),
  isActive: z.boolean().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})

// catalogs/route.ts
export const createCatalogBody = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9-]+$/, "Mã chỉ gồm chữ, số và dấu gạch ngang"),
  name: z.string().trim().min(2).max(120),
  type: z.enum(["STANDARD", "CLIENT"]).optional(),
  description: z.string().max(1000).nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
  productIds: z.array(z.string().min(1)).max(200).optional(),
})

// chain-branches/[branchCode]/route.ts
export const chainBranchPatchBody = z.object({ isActive: z.boolean() })

const branchPhone = z.string().trim().regex(/^\+?\d[\d .-]{7,18}$/, "Số điện thoại không hợp lệ")

const telegramChatId = z.string().trim().regex(/^-?\d{5,20}$/, "Telegram Chat ID chỉ gồm số (nhóm bắt đầu bằng dấu trừ)")

// Giới hạn đầu vào: trước 22/10/2026 route nhận mảng và chuỗi không giới hạn, điểm KPI tuỳ ý
const branchSchema = z.object({
  branchId: z.string().trim().min(1).max(50),
  branchName: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  ward: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  /** Tỉnh / thành phố — nhận cả tên cũ `city` của file mẫu */
  province: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  serviceWards: z.array(z.string().trim().max(120)).max(50).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  maxDeliveryRadiusKm: z.number().min(0).max(500).optional(),
  qualityScore: z.number().min(0).max(100).default(90),
  activeJobsCount: z.number().int().min(0).max(1000).default(0),
  maxConcurrentJobs: z.number().int().min(1).max(1000).default(5),
  isActive: z.boolean().default(true),
  channels: z
    .object({
      phone: branchPhone.optional(),
      telegramChatId: telegramChatId.optional(),
      zaloPhone: branchPhone.optional(),
    })
    .optional(),
})

// chain-branches/bulk-import/route.ts
export const chainBranchImportBody = z.object({
  branches: z
    .array(branchSchema)
    .min(1)
    .max(500)
    .refine((list) => new Set(list.map((b) => b.branchId)).size === list.length, "Mã chi nhánh bị trùng trong tệp"),
})

// change-requests/[id]/decision/route.ts
export const changeDecisionBody = z.object({
  approve: z.boolean(),
  note: z.string().trim().max(500).default(""),
})

// discount-requests/[id]/decision/route.ts
export const discountDecisionBody = z.object({
  approve: z.boolean(),
  // Duyệt khác mức xin: gửi mức mới (vẫn trong trần của Điều hành)
  percent: z.number().int().min(1).max(100).optional(),
  amountVnd: z.number().int().positive().max(1_000_000_000).optional(),
  note: z.string().trim().max(500).default(""),
})

// display-settings/route.ts
export const displaySettingsBody = z.object({
  templateId: z.string().min(1).max(64).optional(),
  fields: z.array(z.string().max(40)).max(20).optional(),
  /** Công tắc giá và thông tin giảm giá cho cả cửa hàng (ALG 5.5) */
  pricing: z.object({ hidePrice: z.boolean().optional(), showDiscounts: z.boolean().optional() }).strict().optional(),
  /** Mã cảm ơn dùng một lần sau đơn hoàn tất (ALG 5.15) */
  thankYou: z.object({ enabled: z.boolean().optional(), percent: z.number().int().min(1).max(100).optional() }).strict().optional(),
}).refine((b) => b.templateId !== undefined || b.pricing !== undefined || b.thankYou !== undefined, { message: "Không có cài đặt nào để lưu" })

const secret = z.string().trim().min(4).max(2000)

// integrations/notifications/route.ts
export const notifySettingsBody = z.object({
  enabled: z.boolean(),
  channel: z.enum(["ZNS", "ESMS"]),
  credentials: z
    .union([
      z.object({ appId: z.string().trim().min(3).max(64), secretKey: secret, accessToken: secret, refreshToken: secret }),
      z.object({ apiKey: secret, secretKey: secret, brandname: z.string().trim().min(2).max(20) }),
    ])
    .optional(),
  templates: z.partialRecord(z.enum(NOTIFY_EVENTS), z.string().trim().max(32)).optional(),
})

// integrations/notifications/test/route.ts
export const notifyTestBody = z.object({ phone: z.string().max(20) })

// integrations/staff-notifications/route.ts
export const staffNotifyBody = z.object({
  enabled: z.boolean(),
  channels: z.array(z.enum(STAFF_NOTIFY_CHANNELS)),
  events: z.record(z.enum(STAFF_NOTIFY_EVENTS), z.boolean()).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
})

// integrations/staff-notifications/saas-policy/route.ts
export const staffNotifySaasPolicyBody = z.object({
  targetOrganizationId: z.string().uuid(),
  allowedChannels: z.array(z.enum(STAFF_NOTIFY_CHANNELS)),
})

// integrations/telegram-dispatch/route.ts
export const telegramTestBody = z.object({
  chatId: z.string().min(1),
  message: z.string().max(1000).optional(),
})

// messages/read/route.ts
export const messagesReadBody = z.object({ messageIds: z.array(z.string().min(1).max(64)).min(1).max(200) })

const STEP_KEYS = ["GENERAL", ...PIPELINE_STEPS.map((s) => s.id)] as [string, ...string[]]

// messages/route.ts
export const messageRef = { orderId: z.string().min(1).max(64).optional(), sessionId: z.string().min(1).max(64).optional() }

const messageRole = z.enum(["ADMIN", "SALE", "COORDINATOR"])

// messages/route.ts
export const sendMessageBody = z.object({
  ...messageRef,
  stepKey: z.enum(STEP_KEYS).default("GENERAL"),
  // Vai người gửi KHÔNG nhận từ client — suy từ năng lực ở máy chủ
  to: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("ROLE"), role: messageRole }),
    z.object({ kind: z.literal("OWNER_SALE") }),
    z.object({ kind: z.literal("USER"), userId: z.string().min(1).max(64) }),
  ]),
  body: z.string().trim().min(1, "Nhập nội dung tin nhắn").max(MAX_MESSAGE_LENGTH),
  replyToId: z.string().min(1).max(64).optional(),
}).refine((v) => !!v.orderId !== !!v.sessionId, { message: "Chọn đúng một đơn hoặc một link" })

// payment-events/[id]/handle/route.ts
export const paymentEventHandleBody = z.object({ note: z.string().trim().min(3, "Ghi chú cách đã xử lý (tối thiểu 3 ký tự)").max(500) })

// sale-visibility/route.ts
export const saleVisibilityBody = z.object({
  userId: z.string().min(1).max(64).optional(),
  mode: z.enum(["ALL", "OWN"]).nullable(),
})

// send-links/[id]/customer/route.ts
export const linkCustomerBody = z.object({
  customerName: z.string().max(100),
  customerPhone: z.string().max(20).nullable().optional(),
})

// send-links/route.ts
export const createSendLinkBody = z.object({
  catalogId: z.string().max(64).optional(),
  catalogCode: z.string().max(40).optional(),
  customerName: z.string().max(100).nullable().optional(),
  customerPhone: z.string().max(20).nullable().optional(),
  prefix: z.string().max(10).optional(),
  customCatalog: z
    .object({
      name: z.string().max(120),
      description: z.string().max(1000).nullable().optional(),
      filters: z.record(z.string(), z.unknown()).nullable().optional(),
      productIds: z.array(z.string().min(1)).min(1).max(200),
    })
    .optional(),
})

// share-links/route.ts
export const shareLinkBody = z.object({ catalogId: z.string().min(1).max(64), channel: z.string().max(32).nullable().optional() })

// tracking/decide-dismiss/route.ts
export const decideDismissBody = z.object({
  id: z.string().min(1, "Thiếu định danh đơn/link"),
  type: z.enum(["ORDER", "SESSION"]),
  approve: z.boolean(),
  note: z.string().max(500).optional(),
})

// tracking/dismiss/route.ts
export const dismissBody = z.object({
  id: z.string().min(1, "Thiếu định danh đơn/link"),
  type: z.enum(["ORDER", "SESSION"]),
  reasonId: z.string().min(1, "Vui lòng chọn lý do"),
  reasonText: z.string().trim().min(2, "Lý do phải có tối thiểu 2 ký tự"),
  note: z.string().max(500).optional(),
})

// tracking/restore/route.ts
export const restoreDismissBody = z.object({
  id: z.string().min(1, "Thiếu định danh đơn/link"),
  type: z.enum(["ORDER", "SESSION"]),
  reason: z.string().max(500).optional(),
})

// tracking/timeline/route.ts
export const timelineQuery = z
  .object({
    orderId: z.string().max(64).optional(),
    sessionId: z.string().max(64).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().regex(/^\d{1,6}$/).optional(),
  })
  .refine((v) => v.orderId || v.sessionId, { message: "Cần orderId hoặc sessionId" })

