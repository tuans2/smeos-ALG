/**
 * STORE DELIVERY EVENTS — StoreOS
 *
 * Sự kiện nhắc lịch giao (checklist 4.32): mốc M1 / M2 trước giờ giao được đẩy thành tin, không chỉ hiện ở
 * thanh nhắc `/dieu-phoi`. Kênh ngoài (Zalo, Telegram, Web Push) chỉ đi khi tầng Mẹ đã bật kênh đó.
 *
 * @module notification/domain/events
 */
import type { NotificationEventDefinition } from "./_contract"

export const STORE_DELIVERY_EVENTS: NotificationEventDefinition[] = [
  {
    key: "DELIVERY_REMINDER_DUE",
    label: "Nhắc lịch giao",
    description: "Trước giờ giao (mặc định 120 và 60 phút, chỉnh được ở cài đặt nhắc việc): nhắc xác nhận bắt đầu làm và chuẩn bị giao",
    group: "DISPATCH",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlarmClock",
    deepLinkTemplate: "/dieu-phoi",
    roleDefaults: [
      { roleKey: "coordinator", channels: ["APP_INBOX", "TELEGRAM", "PUSH", "ZALO"], priority: "URGENT", dispatchMode: "BROADCAST" },
      { roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM", "PUSH"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
]
