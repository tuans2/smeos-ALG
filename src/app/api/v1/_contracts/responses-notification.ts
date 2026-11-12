import { z } from "zod"

import { notifyChannelSchema } from "./requests-notification"

/**
 * Phản hồi `/api/v1/notification/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của use-case (`cascading-policy`,
 * `notification-preference-repository.interface`, danh mục sự kiện `domain/events`) rồi kiểm bằng phản hồi thật ở
 * `tests/tenant/internal-contract-notification.test.ts`. Hình dạng giữ nguyên như route trả hôm nay — gồm cả các
 * `{ success: true, … }` cũ (route có trong `api-envelope-legacy.txt`).
 */
const timestamp = z.iso.datetime()
const TIER = z.enum(["MOTHER", "INDUSTRY", "CHAIN", "STORE"])
const PRIORITY = z.enum(["NORMAL", "URGENT", "CRITICAL"])
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })

const eventDefinition = z.strictObject({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  group: z.string(),
  tier: TIER,
  version: z.number(),
  defaultVisibleToTiers: z.array(z.enum(["INDUSTRY", "CHAIN", "STORE"])),
  roleDefaults: z.array(
    z.strictObject({
      roleKey: z.string(),
      channels: z.array(notifyChannelSchema),
      priority: PRIORITY,
      dispatchMode: z.enum(["OWNER", "BROADCAST"]),
    })
  ),
  deepLinkTemplate: z.string().optional(),
  iconName: z.string().optional(),
  deprecated: z.boolean().optional(),
  replacedBy: z.string().optional(),
})
export const eventsResponse = data(z.array(eventDefinition))

/** Kênh → đang bật toàn sàn. `APP_INBOX` luôn bật. */
export const channelsResponse = data(z.record(z.string(), z.boolean()))

const inboxItem = z.strictObject({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  eventKey: z.string(),
  title: z.string(),
  message: z.string(),
  deepLink: z.string().nullable().optional(),
  priority: z.string(),
  isRead: z.boolean(),
  readAt: timestamp.nullable().optional(),
  createdAt: timestamp,
})
export const inboxResponse = z.strictObject({
  data: z.array(inboxItem),
  pagination: z.strictObject({ page: z.number(), limit: z.number(), total: z.number(), unreadCount: z.number() }),
})
/** `success` = false khi tin không thuộc người/tổ chức của phiên (không đổi gì). */
export const inboxReadResponse = data(z.strictObject({ id: z.string(), read: z.boolean() }))
export const inboxReadAllResponse = data(z.strictObject({ count: z.number() }))

const preferenceRecord = z.strictObject({
  eventKey: z.string(),
  channel: notifyChannelSchema,
  enabled: z.boolean(),
  priority: PRIORITY.optional(),
})
export const preferencesResponse = data(z.array(preferenceRecord))

/** Lệnh ghi trả lại đúng thân đã gửi (sau khi lược đồ kiểm) dưới `data`. */
const echo = data(z.record(z.string(), z.unknown()))
export const updatedResponse = echo
export const hardLockSetResponse = echo
export const hardLockRemovedResponse = echo

const hardLock = z.strictObject({
  eventKey: z.string(),
  channel: notifyChannelSchema,
  tier: TIER,
  scopeId: z.string(),
  enabled: z.boolean(),
  reason: z.string().optional(),
})
export const hardLocksResponse = data(z.array(hardLock))

/** Thiết bị nhận Web Push của chính người gọi (checklist 4.30). */
export const pushStatusResponse = z.strictObject({
  data: z.strictObject({ public_key: z.string().nullable(), available: z.boolean(), devices: z.number(), subscribed: z.boolean() }),
})
export const pushSubscribedResponse = z.strictObject({ data: z.strictObject({ subscribed: z.literal(true) }) })
export const pushUnsubscribedResponse = z.strictObject({ data: z.strictObject({ removed: z.boolean() }) })
