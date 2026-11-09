/**
 * Sự kiện của Trao đổi nội bộ chuỗi ↔ cửa hàng đối tác (kế hoạch `docs/plan/hoan-thien-chat-noi-bo.md`, IC-7.3).
 * Gửi qua `notifyOrganization` từ `internal-chat/infra/chat-notifier.ts`.
 */
import type { NotificationEventDefinition } from "./_contract"

export const INTERNAL_CHAT_EVENTS: NotificationEventDefinition[] = [
  {
    key: "INTERNAL_CHAT_ORDER_INVITE",
    label: "Chuỗi mời nhận đơn gia công",
    description: "Bộ máy điều phối của chuỗi mời cửa hàng nhận một đơn gia công trong Trao đổi nội bộ — có hạn nhận",
    group: "DISPATCH",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Package",
    deepLinkTemplate: "/tin-nhan",
    roleDefaults: [
      { roleKey: "store_admin", channels: ["APP_INBOX"], priority: "URGENT", dispatchMode: "BROADCAST" },
      { roleKey: "florist", channels: ["APP_INBOX"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
  {
    key: "INTERNAL_CHAT_MESSAGE",
    label: "Tin nhắn trao đổi nội bộ mới",
    description: "Chuỗi hoặc cửa hàng đối tác gửi tin trong phòng trao đổi chung (gộp tối đa một thông báo mỗi phòng mỗi 5 phút)",
    group: "NETWORK",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: ["CHAIN"],
    iconName: "MessageSquare",
    deepLinkTemplate: "/tin-nhan",
    roleDefaults: [
      { roleKey: "*", channels: ["APP_INBOX"], priority: "NORMAL", dispatchMode: "BROADCAST" },
    ],
  },

]
