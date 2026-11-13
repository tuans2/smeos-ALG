/**
 * CHAIN EVENTS — Tầng 3: ChainOS tự khai báo
 *
 * Chứa các sự kiện thuộc phạm vi quản lý chuỗi:
 * đơn chuỗi, điều phối chi nhánh, QC chuỗi, đối soát công nợ.
 *
 * FILE ĐỘC LẬP: Chỉ import từ _contract.ts trong cùng thư mục.
 */
import type { TierEventContract } from "./_contract"

export const CHAIN_EVENT_CONTRACT: TierEventContract = {
  tier: "CHAIN",
  version: "1.0.0",
  events: [
    // ── ORDER ────────────────────────────────────────────────────────────
    {
      key: "CHAIN_ORDER_RECEIVED",
      label: "Đơn chuỗi mới",
      description: "Khi có đơn hàng mới từ kênh thương hiệu chuỗi (website, app chuỗi)",
      group: "ORDER",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: ["STORE"],
      iconName: "ShoppingBag",
      deepLinkTemplate: "/don-hang",
      roleDefaults: [
        {
          roleKey: "manager",
          channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
          priority: "URGENT",
          dispatchMode: "BROADCAST",
        },
        {
          roleKey: "coordinator",
          channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
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
    {
      key: "CHAIN_ORDER_STUCK",
      label: "Đơn chuỗi kẹt quá SLA",
      description: "Khi đơn chuỗi không được xử lý trong thời gian quy định của chuỗi",
      group: "ORDER",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: ["STORE"],
      iconName: "Clock",
      deepLinkTemplate: "/don-hang",
      roleDefaults: [
        {
          roleKey: "manager",
          channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
        {
          roleKey: "coordinator",
          channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },

    // ── DISPATCH ─────────────────────────────────────────────────────────
    {
      key: "CHAIN_DISPATCH_TO_BRANCH",
      label: "Bắn đơn về chi nhánh",
      description: "Khi đơn chuỗi được phân bổ tới một chi nhánh cụ thể",
      group: "DISPATCH",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: ["STORE"],
      iconName: "Send",
      deepLinkTemplate: "/don-hang",
      roleDefaults: [
        {
          roleKey: "coordinator",
          channels: ["APP_INBOX", "TELEGRAM"],
          priority: "NORMAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },
    {
      key: "CHAIN_BRANCH_REJECTED_ORDER",
      label: "Chi nhánh từ chối đơn",
      description: "Khi chi nhánh từ chối tiếp nhận đơn được bắn về",
      group: "DISPATCH",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "XCircle",
      deepLinkTemplate: "/don-hang",
      roleDefaults: [
        {
          roleKey: "manager",
          channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
        {
          roleKey: "coordinator",
          channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },

    // ── QC ───────────────────────────────────────────────────────────────
    {
      key: "CHAIN_QC_PHOTO_SUBMITTED",
      label: "Ảnh QC chi nhánh chờ duyệt",
      description: "Khi chi nhánh nộp ảnh QC sản phẩm chờ trung tâm chuỗi phê duyệt",
      group: "QC",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: ["STORE"],
      iconName: "Camera",
      deepLinkTemplate: "/dieu-phoi",
      roleDefaults: [
        {
          roleKey: "quality_control",
          channels: ["APP_INBOX", "PUSH"],
          priority: "NORMAL",
          dispatchMode: "BROADCAST",
        },
        {
          roleKey: "manager",
          channels: ["APP_INBOX"],
          priority: "NORMAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },
    {
      key: "CHAIN_QC_APPROVED",
      label: "QC chi nhánh đã duyệt",
      description: "Khi trung tâm chuỗi phê duyệt ảnh QC của chi nhánh",
      group: "QC",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: ["STORE"],
      iconName: "CheckCircle",
      deepLinkTemplate: "/dieu-phoi",
      roleDefaults: [
        {
          roleKey: "florist",
          channels: ["APP_INBOX", "PUSH"],
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

    // ── NETWORK ──────────────────────────────────────────────────────────
    {
      key: "CHAIN_BRANCH_OFFLINE",
      label: "Chi nhánh ngừng hoạt động",
      description: "Khi một chi nhánh chuyển sang trạng thái ngưng nhận đơn",
      group: "NETWORK",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "WifiOff",
      deepLinkTemplate: "/dieu-phoi/doi-tac",
      roleDefaults: [
        {
          roleKey: "manager",
          channels: ["APP_INBOX", "TELEGRAM", "EMAIL", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
        {
          roleKey: "coordinator",
          channels: ["APP_INBOX", "TELEGRAM", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },

    // ── FINANCE ──────────────────────────────────────────────────────────
    {
      key: "CHAIN_CLEARING_DUE",
      label: "Đối soát công nợ chi nhánh",
      description: "Khi đến kỳ đối soát công nợ giữa trung tâm chuỗi và các chi nhánh",
      group: "FINANCE",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: ["STORE"],
      iconName: "FileText",
      deepLinkTemplate: "/so-lieu",
      roleDefaults: [
        {
          roleKey: "manager",
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
    // ── NETWORK (UJ-10) ─────────────────────────────────────────────────
    {
      key: "CHAIN_PARTNER_RESPONDED",
      label: "Cửa hàng trả lời lời mời liên kết",
      description: "Cửa hàng đồng ý / từ chối lời mời liên kết, hoặc tự rời chuỗi",
      group: "NETWORK",
      tier: "CHAIN",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "Network",
      deepLinkTemplate: "/dieu-phoi/doi-tac",
      roleDefaults: [
        { roleKey: "manager", channels: ["APP_INBOX"], priority: "NORMAL", dispatchMode: "BROADCAST" },
        { roleKey: "coordinator", channels: ["APP_INBOX"], priority: "NORMAL", dispatchMode: "BROADCAST" },
      ],
    },
  ],
}
