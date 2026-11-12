/**
 * STORE ORDER & PRODUCTION EVENTS — StoreOS
 *
 * Chứa các sự kiện liên quan đến đơn hàng, thanh toán và chế tác.
 * Tách file để tuân thủ giới hạn 350 dòng/tệp (SRP).
 *
 * @module notification/domain/events
 */
import type { NotificationEventDefinition } from "./_contract"

export const STORE_ORDER_EVENTS: NotificationEventDefinition[] = [
  // ── ORDER ────────────────────────────────────────────────────────────
  {
    key: "ORDER_RECEIVED",
    label: "Đơn hàng mới",
    description: "Khi có đơn hàng mới từ khách (tại quầy, online, bộ sưu tập riêng)",
    group: "ORDER",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "ShoppingBag",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "store_admin",
        channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "sales",
        channels: ["APP_INBOX", "TELEGRAM"],
        priority: "URGENT",
        dispatchMode: "OWNER",
      },
      {
        roleKey: "customer_service",
        channels: ["APP_INBOX", "TELEGRAM"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
    ],
  },
  {
    key: "ORDER_ACCEPTED",
    label: "Đơn đã xác nhận",
    description: "Khi đơn hàng được xác nhận và bắt đầu sản xuất",
    group: "ORDER",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "CheckCircle",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "coordinator",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "florist",
        channels: ["APP_INBOX", "PUSH"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
    ],
  },
  {
    key: "ORDER_CANCELLED",
    label: "Đơn hàng bị hủy",
    description: "Khi đơn hàng bị hủy bởi khách hoặc cửa hàng",
    group: "ORDER",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "XCircle",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "store_admin",
        channels: ["APP_INBOX", "TELEGRAM"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "sales",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
      {
        roleKey: "florist",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
    ],
  },
  {
    key: "ORDER_DEADLINE_APPROACHING",
    label: "Đơn sắp đến hạn giao",
    description: "Khi đơn hàng còn ít hơn 1 giờ tới giờ hẹn giao",
    group: "ORDER",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Clock",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "store_admin",
        channels: ["APP_INBOX", "PUSH"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "coordinator",
        channels: ["APP_INBOX", "PUSH"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "florist",
        channels: ["APP_INBOX", "PUSH"],
        priority: "URGENT",
        dispatchMode: "OWNER",
      },
    ],
  },
  {
    key: "ORDER_DELIVERED",
    label: "Đơn giao thành công",
    description: "Khi đơn hàng đã được giao tận tay khách",
    group: "ORDER",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Truck",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "sales",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
      {
        roleKey: "customer_service",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
    ],
  },

  // ── PAYMENT ──────────────────────────────────────────────────────────
  {
    key: "PAYMENT_DEPOSIT_CONFIRMED",
    label: "Đã cọc tiền",
    description: "Khi khách hàng đã thanh toán tiền cọc thành công",
    group: "PAYMENT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "CreditCard",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "sales",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
      {
        roleKey: "coordinator",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
    ],
  },
  {
    key: "PAYMENT_FULLY_PAID",
    label: "Đã thanh toán đủ",
    description: "Khi đơn hàng đã được thanh toán 100%",
    group: "PAYMENT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "DollarSign",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "sales",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "OWNER",
      },
      {
        roleKey: "finance_accounting",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
    ],
  },
  {
    key: "PAYMENT_REFUND_REQUESTED",
    label: "Yêu cầu hoàn tiền",
    description: "Khi có yêu cầu hoàn tiền cho đơn hàng hủy/lỗi",
    group: "PAYMENT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "RotateCcw",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "store_admin",
        channels: ["APP_INBOX", "TELEGRAM"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
      {
        roleKey: "finance_accounting",
        channels: ["APP_INBOX"],
        priority: "URGENT",
        dispatchMode: "BROADCAST",
      },
    ],
  },

  // ── PRODUCTION ───────────────────────────────────────────────────────
  {
    key: "FLORIST_TASK_ASSIGNED",
    label: "Phiếu chế tác mới",
    description: "Khi thợ được phân công phiếu chế tác (cắm, may đo, nấu...) mới",
    group: "PRODUCTION",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Hammer",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "florist",
        channels: ["APP_INBOX", "PUSH"],
        priority: "URGENT",
        dispatchMode: "OWNER",
      },
      {
        roleKey: "coordinator",
        channels: ["APP_INBOX"],
        priority: "NORMAL",
        dispatchMode: "BROADCAST",
      },
    ],
  },
  {
    key: "PRODUCT_READY_FOR_DELIVERY",
    label: "Sản phẩm hoàn thiện",
    description: "Khi sản phẩm đã hoàn thành chế tác và sẵn sàng giao",
    group: "PRODUCTION",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Package",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      {
        roleKey: "coordinator",
        channels: ["APP_INBOX", "TELEGRAM"],
        priority: "URGENT",
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
  // Đơn hàng đa nguồn (PO 31/10/2026) — giao trước, thu sau cho đơn ngoài Thẻ chào
  {
    key: "ORDER_DELIVER_BEFORE_PAY_REQUESTED",
    label: "Xin giao trước, thu sau",
    description: "Khi Sale xin giao trước, thu sau cho đơn ngoài chính sách — chờ Điều hành duyệt",
    group: "PAYMENT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "ShieldCheck",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [{ roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" }],
  },
  {
    key: "ORDER_COLLECT_DUE",
    label: "Tới hạn thu tiền",
    description: "Khi đơn được giao trước đã tới hạn thu mà còn nợ",
    group: "PAYMENT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "Clock",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      { roleKey: "sales", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "OWNER" },
      { roleKey: "store_admin", channels: ["APP_INBOX"], priority: "NORMAL", dispatchMode: "BROADCAST" },
    ],
  },
  // PO 12/11/2026 (audit BL-29): nợ quá hạn đã nhắc Sale 3 lần mà chưa thu → Điều hành xử lý
  {
    key: "ORDER_COLLECT_DUE_ESCALATED",
    label: "Nợ quá hạn cần Điều hành xử lý",
    description: "Khi đơn giao trước, thu sau đã nhắc Sale 3 lần mà vẫn chưa thu được tiền",
    group: "PAYMENT",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlertTriangle",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [{ roleKey: "store_admin", channels: ["APP_INBOX", "TELEGRAM"], priority: "URGENT", dispatchMode: "BROADCAST" }],
  },
  // Checklist ALG 4.14 — yêu cầu bổ sung thông tin đơn quá hạn chưa có câu trả lời
  {
    key: "ORDER_INFO_REQUEST_OVERDUE",
    label: "Quá hạn bổ sung thông tin đơn",
    description: "Khi đơn còn thiếu địa chỉ, số điện thoại người nhận hoặc lời chúc quá hạn hỏi lại",
    group: "ORDER",
    tier: "STORE",
    version: 1,
    defaultVisibleToTiers: [],
    iconName: "AlertCircle",
    deepLinkTemplate: "/don-hang",
    roleDefaults: [
      { roleKey: "sales", channels: ["APP_INBOX"], priority: "URGENT", dispatchMode: "OWNER" },
      { roleKey: "coordinator", channels: ["APP_INBOX"], priority: "NORMAL", dispatchMode: "BROADCAST" },
    ],
  },
]
