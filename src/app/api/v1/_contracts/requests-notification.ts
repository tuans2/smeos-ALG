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
  event_key: z.string().min(1),
  channel: notifyChannelSchema,
  role_key: z.string().min(1),
  enabled: z.boolean(),
  priority_override: z.enum(["NORMAL", "URGENT", "CRITICAL"]).optional(),
})

// preferences/route.ts
export const patchPreferenceSchema = z.object({
  event_key: z.string().min(1),
  channel: notifyChannelSchema,
  enabled: z.boolean(),
  mute_until: z.string().datetime().optional(),
})

// store-defaults/route.ts
export const patchStoreDefaultSchema = z.object({
  event_key: z.string().min(1),
  channel: notifyChannelSchema,
  role_key: z.string().min(1),
  enabled: z.boolean(),
  schedule_start: z.string().optional(),
  schedule_end: z.string().optional(),
})

// org-hard-locks/route.ts, store-hard-locks/route.ts
export const postHardLockSchema = z.object({
  event_key: z.string().min(1),
  channel: notifyChannelSchema,
  enabled: z.boolean(),
  reason: z.string().optional(),
})

export const deleteHardLockSchema = z.object({
  event_key: z.string().min(1),
  channel: notifyChannelSchema,
})

// ── Query — chỉ mô tả ────────────────────────────────────────────────────────
const int = z.string().regex(/^-?\d+$/)

export const eventsQuery = z.object({ tier: z.enum(["MOTHER", "INDUSTRY", "CHAIN", "STORE"]).optional() })
export const inboxQuery = z.object({ page: int.optional(), limit: int.optional(), unread_only: z.enum(["true", "false"]).optional() })
export const storeDefaultsQuery = z.object({ role_key: z.string().optional() })

// push-subscriptions/route.ts — thiết bị nhận Web Push của chính người gọi (checklist 4.30)
const pushEndpoint = z.string().url().max(1000)
const pushKey = z.string().regex(/^[A-Za-z0-9_-]+$/).max(200)
export const pushStatusQuery = z.object({ endpoint: pushEndpoint.optional() })
export const pushSubscribeBody = z.object({ endpoint: pushEndpoint, keys: z.object({ p256dh: pushKey, auth: pushKey }) })
export const pushUnsubscribeBody = z.object({ endpoint: pushEndpoint })
