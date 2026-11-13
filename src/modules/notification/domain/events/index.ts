/**
 * NOTIFICATION EVENT REGISTRY — Aggregator trung tâm (SaaS Mother giữ)
 *
 * Import contracts từ tất cả tầng → tổng hợp thành 1 registry duy nhất.
 * Validate duplicate keys lúc startup.
 *
 * KHI TÁCH REPO: File này chỉ tồn tại ở Mother repo.
 * Các tầng dưới chạy với contract riêng + local registry nhỏ.
 *
 * Để THÊM EVENT MỚI: Sửa file contract của tầng tương ứng.
 * Registry này tự pickup — không cần sửa file này.
 */
import { MOTHER_EVENT_CONTRACT } from "./mother-events"
import { INDUSTRY_EVENT_CONTRACT } from "./industry-events"
import { CHAIN_EVENT_CONTRACT } from "./chain-events"
import { STORE_EVENT_CONTRACT } from "./store-events"
import type {
  TierEventContract,
  NotificationEventDefinition,
  NotificationTier,
  NotificationSubTier,
} from "./_contract"

/** Tất cả contracts đăng ký ở đây — giống INDUSTRY_REGISTRY */
const ALL_TIER_CONTRACTS: readonly TierEventContract[] = [
  MOTHER_EVENT_CONTRACT,
  INDUSTRY_EVENT_CONTRACT,
  CHAIN_EVENT_CONTRACT,
  STORE_EVENT_CONTRACT,
]

// ── Validation lúc startup — phát hiện duplicate key ngay khi load module ──
const _allEvents = ALL_TIER_CONTRACTS.flatMap((c) => c.events)
const _keySet = new Set<string>()
for (const evt of _allEvents) {
  if (_keySet.has(evt.key)) {
    throw new Error(
      `[NotificationRegistry] Duplicate event key: "${evt.key}" — mỗi key chỉ được khai báo 1 lần duy nhất.`
    )
  }
  _keySet.add(evt.key)
}

/**
 * Registry map: event key → definition (O(1) lookup).
 * Dùng để validate event key khi resolve preferences.
 */
export const NOTIFICATION_EVENT_REGISTRY: ReadonlyMap<string, NotificationEventDefinition> =
  new Map(_allEvents.map((e) => [e.key, e]))

/** Lấy tất cả events (không bao gồm deprecated) */
export function listAllEvents(): NotificationEventDefinition[] {
  return _allEvents.filter((e) => !e.deprecated)
}

/** Lấy events theo tầng sở hữu */
export function getEventsByTier(tier: NotificationTier): NotificationEventDefinition[] {
  return _allEvents.filter((e) => e.tier === tier && !e.deprecated)
}

/**
 * Lấy events mà một tầng có quyền thấy (Visibility).
 * Mother luôn thấy tất cả.
 * Các tầng khác luôn thấy:
 * 1. Sự kiện do chính tầng đó sở hữu (e.tier === tier)
 * 2. Sự kiện tầng trên cho phép hiển thị xuống (defaultVisibleToTiers chứa tier đó)
 * (Visibility có thể bị override bởi quyết định `notification.visibility` trong governance_decisions)
 */
export function getDefaultVisibleEvents(tier: NotificationTier): NotificationEventDefinition[] {
  if (tier === "MOTHER") return listAllEvents()
  return _allEvents.filter(
    (e) =>
      !e.deprecated &&
      (e.tier === tier || e.defaultVisibleToTiers.includes(tier as NotificationSubTier))
  )
}

/**
 * Lấy events liên quan đến một vai (roleKey xuất hiện trong roleDefaults).
 * "*" trong roleKey nghĩa là tất cả vai.
 */
export function getEventsForRole(
  tier: NotificationTier,
  roleKey: string
): NotificationEventDefinition[] {
  return getDefaultVisibleEvents(tier).filter((e) =>
    e.roleDefaults.some((rd) => rd.roleKey === roleKey || rd.roleKey === "*")
  )
}

/** Validate event key tồn tại và chưa deprecated */
export function isValidEventKey(key: string): boolean {
  const evt = NOTIFICATION_EVENT_REGISTRY.get(key)
  return evt !== undefined && !evt.deprecated
}

/** Lấy contract theo tầng — dùng cho version checking */
export function getTierContract(tier: NotificationTier): TierEventContract | undefined {
  return ALL_TIER_CONTRACTS.find((c) => c.tier === tier)
}

/** Tổng số events (không bao gồm deprecated) */
export function getEventCount(): number {
  return listAllEvents().length
}

export const getAllNotificationEvents = listAllEvents

export function getNotificationEvent(key: string): NotificationEventDefinition | undefined {
  return NOTIFICATION_EVENT_REGISTRY.get(key)
}

