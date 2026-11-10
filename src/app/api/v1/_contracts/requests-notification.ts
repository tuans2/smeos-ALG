import { z } from "zod"

/**
 * Lược đồ yêu cầu của `/api/v1/notification/*` — hệ thông báo 4 tầng (OpenAPI nội bộ, PO 07/11/2026). Lược đồ thân
 * từng khai trong 5 route được chuyển NGUYÊN VĂN về đây và route import lại (danh sách kênh giống hệt nhau ở cả 5 nên
 * gom một chỗ); lược đồ query chỉ để mô tả — route tự đọc `searchParams`.
 */
export const notifyChannelSchema = z.enum([
  "APP_INBOX",
  "EMAIL",
  "PUSH",
  "TELEGRAM",
  "ZALO",
  "SMS",
  "WHATSAPP",
  "MESSENGER",
])

// org-policy/route.ts
export const patchOrgPolicySchema = z.object({
  eventKey: z.string().min(1),
  channel: notifyChannelSchema,
  roleKey: z.string().min(1),
  enabled: z.boolean(),
  priorityOverride: z.enum(["NORMAL", "URGENT", "CRITICAL"]).optional(),
})

// preferences/route.ts
export const patchPreferenceSchema = z.object({
  eventKey: z.string().min(1),
  channel: notifyChannelSchema,
  enabled: z.boolean(),
  muteUntil: z.string().datetime().optional(),
})

// store-defaults/route.ts
export const patchStoreDefaultSchema = z.object({
  eventKey: z.string().min(1),
  channel: notifyChannelSchema,
  roleKey: z.string().min(1),
  enabled: z.boolean(),
  scheduleStart: z.string().optional(),
  scheduleEnd: z.string().optional(),
})

// org-hard-locks/route.ts, store-hard-locks/route.ts
export const postHardLockSchema = z.object({
  eventKey: z.string().min(1),
  channel: notifyChannelSchema,
  enabled: z.boolean(),
  reason: z.string().optional(),
})

export const deleteHardLockSchema = z.object({
  eventKey: z.string().min(1),
  channel: notifyChannelSchema,
})

// ── Query — chỉ mô tả ────────────────────────────────────────────────────────
const int = z.string().regex(/^-?\d+$/)

export const eventsQuery = z.object({ tier: z.enum(["MOTHER", "INDUSTRY", "CHAIN", "STORE"]).optional() })
export const inboxQuery = z.object({ page: int.optional(), limit: int.optional(), unreadOnly: z.enum(["true", "false"]).optional() })
export const storeDefaultsQuery = z.object({ roleKey: z.string().optional() })
