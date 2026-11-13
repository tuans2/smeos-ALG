/**
 * INTEGRATION EVENTS — Trung tâm Tích hợp (GĐ1, 30/10/2026)
 *
 * Phát khi một kết nối tới dịch vụ ngoài gặp sự cố hoặc một sự kiện nhận về
 * đã hết lượt thử lại. Dùng chung cho Cửa hàng và Chuỗi.
 *
 * @module notification/domain/events
 */
import type { NotificationEventDefinition } from "./_contract"

const ADMINS = [
  { roleKey: "store_admin", channels: ["APP_INBOX", "EMAIL"], priority: "URGENT", dispatchMode: "BROADCAST" },
  { roleKey: "manager", channels: ["APP_INBOX", "EMAIL"], priority: "URGENT", dispatchMode: "BROADCAST" },
] satisfies NotificationEventDefinition["roleDefaults"]

export const INTEGRATION_EVENTS: NotificationEventDefinition[] = [
  {
    key: "INTEGRATION_CONNECTION_DEGRADED",
    label: "Kết nối dịch vụ ngoài gặp sự cố",
    description: "Khi một kết nối (sàn bán hàng, Zalo, Facebook, thanh toán…) hết hạn hoặc không còn hoạt động",
    group: "INFRA",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: ["CHAIN"],
    iconName: "PlugZap",
    deepLinkTemplate: "/tich-hop",
    roleDefaults: ADMINS,
  },
  {
    key: "INTEGRATION_EVENT_DEAD",
    label: "Sự kiện từ dịch vụ ngoài không xử lý được",
    description: "Khi dữ liệu gửi về (đơn, tin nhắn, chuyển khoản) đã thử lại nhiều lần vẫn lỗi và cần xử lý tay",
    group: "INFRA",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: ["CHAIN"],
    iconName: "TriangleAlert",
    deepLinkTemplate: "/tich-hop",
    roleDefaults: ADMINS,
  },
]
