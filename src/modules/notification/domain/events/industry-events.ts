/**
 * INDUSTRY EVENTS — Tầng 2: SaaS Ngành tự khai báo
 *
 * Chứa các sự kiện thuộc phạm vi mạng lưới affiliate/đối tác:
 * đơn affiliate, SLA đối tác, hoa hồng, QC mạng lưới.
 *
 * FILE ĐỘC LẬP: Chỉ import từ _contract.ts trong cùng thư mục.
 */
import type { TierEventContract } from "./_contract"

export const INDUSTRY_EVENT_CONTRACT: TierEventContract = {
  tier: "INDUSTRY",
  version: "1.0.0",
  events: [
    // ── ORDER ────────────────────────────────────────────────────────────
    {
      key: "AFFILIATE_ORDER_RECEIVED",
      label: "Đơn affiliate mới",
      description: "Khi có đơn hàng mới từ kênh affiliate/đối tác",
      group: "ORDER",
      tier: "INDUSTRY",
      version: 1,
      defaultVisibleToTiers: ["CHAIN", "STORE"],
      iconName: "ShoppingBag",
      deepLinkTemplate: "/don-hang",
      roleDefaults: [
        {
          roleKey: "industry_admin",
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

    // ── DISPATCH ─────────────────────────────────────────────────────────
    {
      key: "AFFILIATE_DISPATCH_FAILED",
      label: "Điều phối affiliate thất bại",
      description: "Khi hệ thống không thể tự động phân bổ đơn affiliate cho đối tác nào",
      group: "DISPATCH",
      tier: "INDUSTRY",
      version: 1,
      defaultVisibleToTiers: ["CHAIN"],
      iconName: "AlertCircle",
      deepLinkTemplate: "/dieu-phoi",
      roleDefaults: [
        {
          roleKey: "industry_admin",
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

    // ── NETWORK ──────────────────────────────────────────────────────────
    {
      key: "PARTNER_JOINED_NETWORK",
      label: "Đối tác mới gia nhập mạng lưới",
      description: "Khi một cửa hàng/đối tác mới chấp nhận lời mời gia nhập mạng lưới",
      group: "NETWORK",
      tier: "INDUSTRY",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "UserPlus",
      deepLinkTemplate: "/dieu-phoi/doi-tac",
      roleDefaults: [
        {
          roleKey: "industry_admin",
          channels: ["APP_INBOX", "EMAIL"],
          priority: "NORMAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },
    {
      key: "PARTNER_SLA_BREACH",
      label: "Đối tác vi phạm SLA",
      description: "Khi đối tác liên tục giao hàng trễ hạn hoặc QC thất bại vượt ngưỡng",
      group: "NETWORK",
      tier: "INDUSTRY",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "AlertTriangle",
      deepLinkTemplate: "/dieu-phoi/doi-tac",
      roleDefaults: [
        {
          roleKey: "industry_admin",
          channels: ["APP_INBOX", "EMAIL", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },

    // ── QC ───────────────────────────────────────────────────────────────
    {
      key: "NETWORK_QC_REJECTION_RATE_HIGH",
      label: "Tỷ lệ QC rejected mạng lưới cao",
      description: "Khi tỷ lệ ảnh QC bị rejected toàn mạng lưới vượt ngưỡng cảnh báo",
      group: "QC",
      tier: "INDUSTRY",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "AlertTriangle",
      roleDefaults: [
        {
          roleKey: "industry_admin",
          channels: ["APP_INBOX", "EMAIL"],
          priority: "URGENT",
          dispatchMode: "BROADCAST",
        },
      ],
    },

    // ── FINANCE ──────────────────────────────────────────────────────────
    {
      key: "COMMISSION_SETTLEMENT_DUE",
      label: "Đối soát hoa hồng",
      description: "Khi đến kỳ đối soát hoa hồng với đối tác trong mạng lưới",
      group: "FINANCE",
      tier: "INDUSTRY",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "Banknote",
      deepLinkTemplate: "/so-lieu",
      roleDefaults: [
        {
          roleKey: "industry_admin",
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
  ],
}
