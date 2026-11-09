import { z } from "zod"

import { data, timestamp } from "./responses-orders"
import { ROLE } from "./responses-greeting-shared"

/**
 * Phản hồi Thẻ chào — vận hành: Hộp việc, tích hợp (thanh toán, thông báo khách/nhân viên, Telegram, Zalo), chi nhánh
 * chuỗi, quyền xem của Sale, giao dịch ngân hàng (OpenAPI nội bộ, PO 07/11/2026). Kiểm bằng phản hồi thật ở
 * `tests/tenant/internal-contract-greeting-ops.test.ts`.
 */
const INBOX_KIND = z.enum([
  "STUCK", "CONFIRM_PAYMENT", "QUOTE", "ASSIGN", "UNMATCHED_PAYMENTS", "DISCOUNT", "CHANGE_REQUEST", "REDELIVER",
  "CANCELLATION_REQUEST", "REMIND_BALANCE_PAYMENT", "WAITING_SECOND_PAYMENT", "COLLECT_POST_DELIVERY_BALANCE",
  "FOLLOW_UP_LEAD", "REMIND_DEPOSIT", "CLAIM_ORDER", "SEND_PHOTO_QC", "DELIVERY_FAILED_SALE_CONTACT",
  "CHECK_ARRANGING_PROGRESS", "QC_INSPECTION", "ASSIGN_SHIPPER", "CANCELLATION_FOLLOW_UP", "PRODUCT_PROPOSALS", "MISSING_INFO",
])
const CHANGE_FIELD = z.enum(["schedule", "recipientName", "recipientPhone", "deliveryAddress", "shippingZone", "cardMessage", "deliveryNote", "mapUrl"])
export const inboxResponse = data(
  z.strictObject({
    role: ROLE,
    canSwitchRole: z.boolean(),
    actions: z.array(
      z.strictObject({
        id: z.string(),
        kind: INBOX_KIND,
        title: z.string(),
        detail: z.string(),
        orderId: z.string().nullable(),
        sessionId: z.string().nullable(),
        customerName: z.string().nullable(),
        imageUrl: z.string().nullable(),
        tab: z.enum(["payment", "sales", "coordinator", "tracking"]),
        urgency: z.number(),
        href: z.string().optional(),
        discount: z
          .strictObject({
            requestId: z.string(),
            requester: z.string(),
            reason: z.string(),
            baseTotalVnd: z.number(),
            requestedVnd: z.number(),
            percent: z.number().nullable(),
            maxPercent: z.number(),
          })
          .optional(),
        followUp: z.strictObject({ requestId: z.string(), refundDueVnd: z.number(), reason: z.string() }).optional(),
        change: z
          .strictObject({
            requestId: z.string(),
            changes: z.array(z.strictObject({ field: CHANGE_FIELD, label: z.string(), before: z.string(), after: z.string() })),
            note: z.string().nullable(),
            expectedFeeDeltaVnd: z.number(),
            requestedAt: z.string(),
          })
          .optional(),
      })
    ),
    threads: z.array(
      z.strictObject({
        key: z.string(),
        orderId: z.string().nullable(),
        sessionId: z.string().nullable(),
        title: z.string(),
        lastBody: z.string(),
        lastSender: z.string(),
        lastAt: z.string(),
        unread: z.number(),
        unreadIds: z.array(z.string()),
      })
    ),
    updates: z.array(
      z.strictObject({
        id: z.string(),
        orderId: z.string().nullable(),
        sessionId: z.string().nullable(),
        customerName: z.string(),
        title: z.string(),
        code: z.string(),
        at: z.string(),
      })
    ),
    counts: z.strictObject({ actions: z.number(), unreadMessages: z.number(), total: z.number() }),
  })
)

export const integrationStatusResponse = data(
  z.strictObject({
    payment: z.strictObject({ enabled: z.boolean(), provider: z.string().nullable(), keyHint: z.string().nullable(), webhookPath: z.string() }),
    notify: z.strictObject({ enabled: z.boolean(), channel: z.string().nullable(), configured: z.boolean(), templates: z.record(z.string(), z.string()) }),
  })
)
/** Khoá webhook ngân hàng trả đúng MỘT lần khi tạo/đổi. */
export const webhookKeyResponse = data(z.strictObject({ apiKey: z.string(), provider: z.string(), webhookPath: z.string() }))
export const webhookDisabledResponse = data(z.strictObject({ enabled: z.boolean() }))
export const notifySettingsResponse = data(z.strictObject({ enabled: z.boolean(), channel: z.enum(["ZNS", "ESMS"]), templates: z.record(z.string(), z.string()) }))
export const notifyTestResponse = data(z.strictObject({ sent: z.boolean() }))
const STAFF_CHANNEL = z.enum(["APP_INBOX", "ZALO", "SMS", "TELEGRAM", "WHATSAPP", "MESSENGER"])
export const staffNotifySettingsResponse = data(
  z.strictObject({
    enabled: z.boolean(),
    channels: z.array(STAFF_CHANNEL),
    events: z.record(z.string(), z.boolean()),
    saasAllowedChannels: z.array(STAFF_CHANNEL),
    hasCredentials: z.boolean(),
  })
)
export const staffNotifySavedResponse = data(z.strictObject({ success: z.boolean() }))
export const telegramDispatchResponse = data(
  z.strictObject({
    configured: z.boolean(),
    bot: z.strictObject({ id: z.number(), is_bot: z.boolean(), first_name: z.string(), username: z.string(), can_join_groups: z.boolean().optional() }).nullable(),
    linkCode: z.string().nullable(),
    /** Nhóm đã nhắn đúng mã liên kết của tổ chức. */
    recentChats: z.array(z.strictObject({ id: z.string(), title: z.string(), type: z.string() })),
    error: z.string().optional(),
  })
)
export const telegramTestResponse = data(z.strictObject({ success: z.literal(true), messageId: z.number().optional() }))
export const telegramUnlinkResponse = data(z.strictObject({ removed: z.string() }))
export const zaloDispatchResponse = data(
  z.strictObject({
    configured: z.boolean(),
    followUrl: z.string().nullable(),
    branches: z.array(z.strictObject({ branchCode: z.string(), name: z.string(), linkCode: z.string(), linked: z.boolean() })),
  })
)

export const chainBranchesResponse = data(
  z.array(
    z.strictObject({
      branchCode: z.string(),
      name: z.string(),
      address: z.string().nullable(),
      phone: z.string().nullable(),
      isActive: z.boolean(),
      telegramChatId: z.string().nullable(),
      telegramLinked: z.boolean(),
      /** Cửa hàng đối tác có tài khoản smeOS (dòng ứng viên mang `partner_org_id`) */
      partnerStore: z.boolean(),
      zalo: z.boolean(),
    })
  )
)
export const chainBranchPatchResponse = data(z.strictObject({ branchCode: z.string(), isActive: z.boolean() }))
export const chainBranchImportResponse = data(
  z.strictObject({
    created: z.number(),
    updated: z.number(),
    total: z.number(),
    geocoded: z.number(),
    geocodeNotFound: z.number(),
    geocodeSkipped: z.number(),
    errors: z.array(z.unknown()),
  })
)

export const saleVisibilityResponse = data(
  z.strictObject({
    defaultMode: z.enum(["ALL", "OWN"]),
    members: z.array(z.strictObject({ userId: z.string(), name: z.string(), roleName: z.string(), mode: z.enum(["ALL", "OWN"]).nullable() })),
  })
)
export const paymentEventsResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      amount_vnd: z.number(),
      id: z.string(),
      organization_id: z.string(),
      created_at: timestamp,
      provider: z.string(),
      status: z.string(),
      order_id: z.string().nullable(),
      external_id: z.string(),
      content: z.string(),
      account_no: z.string().nullable(),
      transaction_at: timestamp.nullable(),
      payment_id: z.string().nullable(),
      note: z.string().nullable(),
    })
  ),
  next_cursor: z.string().nullable(),
})
export const paymentEventHandledResponse = data(z.strictObject({ handled: z.boolean() }))
