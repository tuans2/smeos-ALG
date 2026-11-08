/**
 * STORE OPERATION EVENTS — StoreOS
 *
 * Chứa các sự kiện liên quan đến mạng lưới, sản phẩm, AI, CRM và tài chính.
 * Tách file để tuân thủ giới hạn 350 dòng/tệp (SRP).
 *
 * @module notification/domain/events
 */
import type { NotificationEventDefinition } from "./_contract"

export const STORE_OPERATION_EVENTS: NotificationEventDefinition[] = [
  // ── NETWORK ──────────────────────────────────────────────────────────
  {
    key: "SUBCONTRACT_ORDER_RECEIVED",
    label: "Đơn gia công mạng lưới",
    description: "Khi có đơn gia công từ mạng lưới/chuỗi gửi về",
    group: "NETWORK",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Network",
    deepLinkTemplate: "/dieu-phoi",
    roleDefaults: [
      {
        roleKey: "store_admin",
        channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "coordinator",
        channels: ["APP_INBOX", "TELEGRAM"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
    ],
  },
  {
    key: "SUBCONTRACT_DEADLINE_APPROACHING",
    label: "Đơn gia công sắp hết hạn",
    description: "Khi đơn gia công còn ít hơn 2 giờ tới deadline",
    group: "NETWORK",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlertClock",
    deepLinkTemplate: "/dieu-phoi",
    roleDefaults: [
      {
        roleKey: "store_admin",
        channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
        priority: "CRITICAL",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "florist",
        channels: ["APP_INBOX", "PUSH"],
        priority: "CRITICAL",
        dispatchMode: "OWNER",
      },
    ],
  },

  // ── PRODUCT ──────────────────────────────────────────────────────────
  {
    key: "PRODUCT_PROPOSED",
    label: "Mẫu sản phẩm mới chờ duyệt",
    description: "Khi nhân viên đề xuất mẫu sản phẩm mới cần phê duyệt",
    group: "PRODUCT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Package",
    deepLinkTemplate: "/duyet",
    roleDefaults: [
      {
        roleKey: "store_admin",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
    ],
  },
  {
    key: "PRODUCT_APPROVED",
    label: "Mẫu sản phẩm đã duyệt",
    description: "Khi mẫu sản phẩm đề xuất được phê duyệt",
    group: "PRODUCT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "CheckCircle",
    deepLinkTemplate: "/san-pham/{productId}",
    roleDefaults: [
      {
        roleKey: "marketing",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "sales",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
    ],
  },

  // ── AI ───────────────────────────────────────────────────────────────
  {
    key: "AI_JOB_COMPLETED",
    label: "AI xử lý xong",
    description: "Khi một job AI (chỉnh ảnh, viết nội dung...) hoàn thành",
    group: "AI",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Sparkles",
    deepLinkTemplate: "/job/{jobId}",
    roleDefaults: [
      {
        roleKey: "*",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
    ],
  },
  {
    key: "AI_JOB_FAILED",
    label: "AI xử lý thất bại",
    description: "Khi một job AI thất bại sau các lần retry",
    group: "AI",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlertCircle",
    deepLinkTemplate: "/job/{jobId}",
    roleDefaults: [
      {
        roleKey: "*",
        channels: ["APP_INBOX", "PUSH"],
        priority: "URGENT",
        dispatchMode: "OWNER",
      },
    ],
  },

  // ── CRM ──────────────────────────────────────────────────────────────
  {
    key: "CUSTOMER_BIRTHDAY",
    label: "Sinh nhật khách hàng",
    description: "Khi đến ngày sinh nhật của khách hàng trong danh sách CRM",
    group: "CRM",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Cake",
    deepLinkTemplate: "/khach-hang",
    roleDefaults: [
      {
        roleKey: "crm",
        channels: ["APP_INBOX", "EMAIL"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "sales",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
    ],
  },
  {
    key: "CUSTOMER_ANNIVERSARY",
    label: "Ngày kỷ niệm khách hàng",
    description: "Khi đến ngày kỷ niệm đặt biệt của khách (cưới, kỷ niệm...)",
    group: "CRM",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Heart",
    deepLinkTemplate: "/khach-hang",
    roleDefaults: [
      {
        roleKey: "crm",
        channels: ["APP_INBOX", "EMAIL"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "sales",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
    ],
  },

  // ── FINANCE ──────────────────────────────────────────────────────────
  {
    key: "DAILY_REVENUE_SUMMARY",
    label: "Tổng kết doanh thu ngày",
    description: "Báo cáo tổng kết doanh thu cuối ngày",
    group: "FINANCE",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "BarChart3",
    deepLinkTemplate: "/so-lieu",
    roleDefaults: [
      {
        roleKey: "store_admin",
        channels: ["APP_INBOX", "EMAIL"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "ceo",
        channels: ["APP_INBOX", "EMAIL"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "finance_accounting",
        channels: ["APP_INBOX", "EMAIL"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
    ],
  },
  // ── Credit & hạn mức (checklist ALG 10.5) ─────────────────────────────
  {
    key: "USAGE_LIMIT_NEAR",
    label: "Sắp chạm hạn mức credit",
    description: "Khi credit dùng trong tháng (hoặc phần AI) đạt 80% hạn mức — báo một lần mỗi tháng",
    group: "AI",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlertTriangle",
    deepLinkTemplate: "/muc-dung",
    roleDefaults: [
      { roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
  {
    key: "CREDIT_LOW",
    label: "Credit sắp hết",
    description: "Khi số dư credit dưới 20% lần nạp gần nhất (hoặc hạn mức tháng) — báo một lần mỗi tháng",
    group: "AI",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "CreditCard",
    deepLinkTemplate: "/muc-dung",
    roleDefaults: [
      { roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
  {
    key: "CREDIT_OVERDRAFT",
    label: "Credit âm do tin nhắn khách",
    description: "Hết credit nhưng tin nhắn gửi khách vẫn đi trong mức thấu chi — báo khi số dư chuyển sang âm và khi dùng hết mức thấu chi",
    group: "AI",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlertTriangle",
    deepLinkTemplate: "/muc-dung",
    roleDefaults: [
      { roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
  // ── Gói thuê bao (checklist ALG 10.7) ─────────────────────────────────
  {
    key: "SUBSCRIPTION_RENEWAL_DUE",
    label: "Sắp tới hạn gia hạn gói",
    description: "Nhắc 7 ngày và 1 ngày trước hạn thanh toán hoá đơn gia hạn gói dịch vụ",
    group: "AI",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Clock",
    deepLinkTemplate: "/muc-dung",
    roleDefaults: [
      { roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
  {
    key: "SUBSCRIPTION_OVERDUE",
    label: "Gói quá hạn thanh toán",
    description: "Hoá đơn gói dịch vụ tới hạn chưa thanh toán — tài khoản chuyển sang chỉ xem",
    group: "AI",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlertCircle",
    deepLinkTemplate: "/muc-dung",
    roleDefaults: [
      { roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
  // ── Liên kết chuỗi (UJ-10): cửa hàng phải đồng ý mới thành thành viên chuỗi ──
  {
    key: "CHAIN_LINK_INVITED",
    label: "Chuỗi mời liên kết",
    description: "Một chuỗi mời cửa hàng liên kết làm đối tác — cần đồng ý trong 7 ngày",
    group: "NETWORK",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Network",
    deepLinkTemplate: "/cai-dat",
    roleDefaults: [
      { roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
  {
    key: "CHAIN_LINK_STATUS_CHANGED",
    label: "Chuỗi đổi trạng thái liên kết",
    description: "Chuỗi tạm ngưng, mở lại hoặc chấm dứt liên kết với cửa hàng",
    group: "NETWORK",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Network",
    deepLinkTemplate: "/cai-dat",
    roleDefaults: [
      { roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" },
    ],
  },
]
