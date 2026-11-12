/**
 * Sự kiện vòng đời tổ chức gửi cho chủ tiệm (audit User Journey UJ-26, PO 12/11/2026 UQ13): Admin SaaS tạm ngưng,
 * mở lại hoặc chuyển cửa hàng sang thời gian kết thúc dịch vụ — trước đây chủ tiệm không được báo gì.
 *
 * @module notification/domain/events
 */
import type { NotificationEventDefinition } from "./_contract"

export const TENANT_LIFECYCLE_EVENTS: NotificationEventDefinition[] = [
  {
    key: "ORGANIZATION_LIFECYCLE_CHANGED",
    label: "Trạng thái tài khoản cửa hàng thay đổi",
    description: "Khi cửa hàng bị tạm ngưng, được mở lại hoặc chuyển sang thời gian kết thúc dịch vụ",
    group: "TENANT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlertCircle",
    deepLinkTemplate: "/",
    roleDefaults: [{ roleKey: "store_admin", channels: ["APP_INBOX", "EMAIL"], priority: "URGENT", dispatchMode: "BROADCAST" }],
  },
]
