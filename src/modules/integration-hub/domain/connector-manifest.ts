/**
 * Manifest đầu nối — khai báo tĩnh của một nhà cung cấp ngoài (Integration Hub).
 * Danh mục trên giao diện sinh hoàn toàn từ manifest; thêm nhà cung cấp = thêm một manifest + connector.
 * Kế hoạch: docs/kien-truc/KE_HOACH_TRUNG_TAM_TICH_HOP.md
 */

import type { GovernanceTier } from "@/core/governance/layered-resolver"

export type ConnectorCategory =
  | "SALES_CHANNEL"
  | "MESSAGING"
  | "PAYMENT"
  | "NOTIFICATION"
  | "LOGISTICS_INVOICE"
  | "CHAIN_STORE"
  | "API_WEBHOOK"

/** Cách xác thực với nhà cung cấp. */
export type ConnectorAuthKind = "OAUTH2" | "API_KEY" | "BOT_TOKEN" | "WEBHOOK_KEY" | "INTERNAL"

/**
 * Vai của một tầng với đầu nối: PROVIDE (sở hữu app/khoá nền tảng) · ENABLE (bật/tắt cho tầng dưới)
 * · CONNECT (kết nối tài khoản riêng) · INHERIT (dùng kết nối tầng trên) · NONE (không áp dụng).
 */
export type TierRole = "PROVIDE" | "ENABLE" | "CONNECT" | "INHERIT" | "NONE"

/**
 * GA/BETA: kết nối bằng khung Hub · MANAGED: đang chạy bằng phân hệ sẵn có, quản lý ngay trong
 * Trung tâm Tích hợp qua panel nhúng (GĐ2) · LEGACY: còn quản lý ở màn hình cũ · COMING_SOON: chưa kết nối được.
 */
export type ConnectorStatus = "GA" | "BETA" | "MANAGED" | "LEGACY" | "COMING_SOON"

/** Panel cấu hình sẵn có được nhúng vào Trung tâm Tích hợp cho đầu nối MANAGED. */
export type ManagedPanelKey = "chat_channels" | "bank_sync" | "customer_notify" | "staff_telegram" | "api_tokens"

export type ConnectorCapability =
  | "CATALOG_PUSH"
  | "ORDER_PULL"
  | "INVENTORY_PUSH"
  | "MESSAGE_IN"
  | "MESSAGE_OUT"
  | "NOTIFY_OUT"
  | "PAYMENT_IN"
  | "WEBHOOK_IN"

export interface ConnectorManifest {
  readonly key: string
  readonly category: ConnectorCategory
  readonly label: string
  readonly description: string
  readonly capabilities: readonly ConnectorCapability[]
  readonly auth: ConnectorAuthKind
  readonly tiers: Readonly<Record<GovernanceTier, TierRole>>
  /** Tính năng gói dịch vụ cần có (`PLAN_FEATURES`); null = mọi gói. */
  readonly planFeature: string | null
  readonly multiAccount: boolean
  readonly status: ConnectorStatus
  /** Màn hình cũ đang quản lý đầu nối LEGACY. */
  readonly legacyHref?: string
  /** Panel nhúng của đầu nối MANAGED. */
  readonly panel?: ManagedPanelKey
  /**
   * Tuyến tính năng gốc. Tuyến đang bị khoá trên production (`src/lib/feature-lock.ts`) thì đầu nối
   * hiện "Sắp ra mắt" — Trung tâm Tích hợp không được mở lối tắt vào tính năng PO chưa mở.
   */
  readonly featureRoute?: string
  /**
   * Khoá/cấp sẵn theo tầng có được thực thi lúc chạy không. Chỉ bật khi đường dùng thật kiểm chế độ
   * (cổng Hub, webhook Facebook/Zalo) — không cho đặt một khoá mà hệ thống không tôn trọng.
   */
  readonly governable?: boolean
  /** Chỉ bật ngoài production (đầu nối thử). */
  readonly devOnly?: boolean
}

export const CATEGORY_ORDER: readonly ConnectorCategory[] = [
  "SALES_CHANNEL",
  "MESSAGING",
  "PAYMENT",
  "NOTIFICATION",
  "LOGISTICS_INVOICE",
  "CHAIN_STORE",
  "API_WEBHOOK",
]

/** Tầng có thể tự kết nối tài khoản của mình với đầu nối này. */
export function canConnectAt(manifest: ConnectorManifest, tier: GovernanceTier): boolean {
  return manifest.tiers[tier] === "CONNECT"
}
