/**
 * MOTHER EVENTS — Tầng 1: SaaS Mother tự khai báo
 *
 * Chứa các sự kiện thuộc phạm vi quản trị nền tảng:
 * hạ tầng, bảo mật, tenant management, AI quota.
 *
 * FILE ĐỘC LẬP: Chỉ import từ _contract.ts trong cùng thư mục.
 */
import type { TierEventContract } from "./_contract"

export const MOTHER_EVENT_CONTRACT: TierEventContract = {
  tier: "MOTHER",
  version: "1.0.0",
  events: [
    // ── TENANT ──────────────────────────────────────────────────────────
    {
      key: "TENANT_REGISTERED",
      label: "Tổ chức mới đăng ký",
      description: "Khi có tổ chức/cửa hàng mới đăng ký tài khoản",
      group: "TENANT",
      tier: "MOTHER",
      version: 1,
      defaultVisibleToTiers: ["INDUSTRY"],
      iconName: "Building2",
      deepLinkTemplate: "/van-hanh/to-chuc/{orgId}",
      roleDefaults: [
        {
          roleKey: "platform_admin",
          channels: ["APP_INBOX", "EMAIL"],
          priority: "NORMAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },
    {
      key: "TENANT_UPGRADED",
      label: "Nâng cấp gói cước",
      description: "Khi tổ chức nâng cấp lên gói Pro hoặc Enterprise",
      group: "TENANT",
      tier: "MOTHER",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "TrendingUp",
      deepLinkTemplate: "/van-hanh/to-chuc/{orgId}",
      roleDefaults: [
        {
          roleKey: "platform_admin",
          channels: ["APP_INBOX", "EMAIL"],
          priority: "NORMAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },
    {
      key: "TENANT_SUSPENDED",
      label: "Tổ chức bị tạm ngưng",
      description: "Khi tổ chức bị tạm ngưng hoạt động (quá hạn thanh toán, vi phạm)",
      group: "TENANT",
      tier: "MOTHER",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "Ban",
      deepLinkTemplate: "/van-hanh/to-chuc/{orgId}",
      roleDefaults: [
        {
          roleKey: "platform_admin",
          channels: ["APP_INBOX", "EMAIL", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },

    // ── INFRA ────────────────────────────────────────────────────────────
    {
      key: "SYSTEM_HEALTH_DEGRADED",
      label: "Sức khỏe hệ thống giảm",
      description: "Khi một dịch vụ hệ thống gặp sự cố hoặc hiệu suất giảm",
      group: "INFRA",
      tier: "MOTHER",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "AlertTriangle",
      roleDefaults: [
        {
          roleKey: "platform_admin",
          channels: ["APP_INBOX", "EMAIL", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },
    {
      key: "AI_QUOTA_THRESHOLD",
      label: "Hạn mức AI sắp hết",
      description: "Khi token/credit AI của hệ thống đạt 80% hoặc 90% giới hạn",
      group: "AI",
      tier: "MOTHER",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "Zap",
      roleDefaults: [
        {
          roleKey: "platform_admin",
          channels: ["APP_INBOX", "EMAIL"],
          priority: "URGENT",
          dispatchMode: "BROADCAST",
        },
      ],
    },

    // ── SECURITY ─────────────────────────────────────────────────────────
    {
      key: "SUSPICIOUS_ACCESS_DETECTED",
      label: "Phát hiện truy cập bất thường",
      description: "Khi hệ thống phát hiện hành vi đăng nhập hoặc truy cập bất thường",
      group: "SECURITY",
      tier: "MOTHER",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "ShieldAlert",
      roleDefaults: [
        {
          roleKey: "platform_admin",
          channels: ["APP_INBOX", "EMAIL", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },
    {
      key: "TENANT_ISOLATION_BREACH",
      label: "Vi phạm cách ly tenant",
      description: "CRITICAL: Phát hiện dữ liệu của tenant bị truy cập trái phép bởi tenant khác",
      group: "SECURITY",
      tier: "MOTHER",
      version: 1,
      defaultVisibleToTiers: [],
      iconName: "ShieldX",
      roleDefaults: [
        {
          roleKey: "platform_admin",
          channels: ["APP_INBOX", "EMAIL", "PUSH"],
          priority: "CRITICAL",
          dispatchMode: "BROADCAST",
        },
      ],
    },
  ],
}
