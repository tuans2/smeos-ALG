/**
 * CASCADING POLICY — Luật resolve Bottom-up Override + Hard Lock đa tầng
 *
 * Đây là trái tim của hệ thống notification. Khi cần quyết định
 * "có gửi notification hay không", module này resolve theo thứ tự:
 *
 *   GATE 1: Channel được Mother kích hoạt chưa?
 *   GATE 2: Hard Lock (Mother → Industry → Chain → Store)?
 *   BOTTOM-UP: User > Store > Org/Chain > Mother Default
 *
 * Pure TypeScript — không import Prisma; quy luật khoá/ghi đè dùng lõi `@/core/governance/layered-resolver`.
 */
import { isAbove, resolveLayered, winningLock } from "@/core/governance/layered-resolver"
import type { NotifyChannel, NotifyPriority, NotificationTier } from "./events/_contract"

// ── Domain Types ────────────────────────────────────────────────────────────

export interface ChannelActivationMap {
  [channel: string]: boolean
}

export interface HardLockEntry {
  eventKey: string
  channel: NotifyChannel
  tier: NotificationTier
  /** "GLOBAL" nếu tier = MOTHER, organization_id nếu tier khác */
  scopeId: string
  enabled: boolean
  reason?: string | undefined
}

export interface NotificationSetting {
  enabled: boolean
  priority?: NotifyPriority | undefined
}

export interface PreferenceRecord {
  eventKey: string
  channel: NotifyChannel
  enabled: boolean
  priority?: NotifyPriority | undefined
}

export interface ResolveCascadeInput {
  eventKey: string
  channel: NotifyChannel
  userId: string
  roleKey: string
  storeOrgId: string
  parentOrgId?: string | undefined // Chain hoặc Industry org id (nếu có)
  /** Kết quả từ DB — truyền vào để tách biệt I/O khỏi domain logic */
  channelActivations: ChannelActivationMap
  hardLocks: HardLockEntry[]
  userPreference?: PreferenceRecord | null | undefined
  storeDefault?: PreferenceRecord | null | undefined
  orgPolicy?: PreferenceRecord | null | undefined
  motherDefault?: PreferenceRecord | null | undefined
}

export interface ResolveResult {
  enabled: boolean
  priority: NotifyPriority
  /** Tầng nào quyết định kết quả cuối */
  decidedBy: "CHANNEL_NOT_ACTIVATED" | "HARD_LOCK_MOTHER" | "HARD_LOCK_INDUSTRY" | "HARD_LOCK_CHAIN" | "HARD_LOCK_STORE" | "USER" | "STORE" | "ORG" | "MOTHER_DEFAULT" | "SYSTEM_DEFAULT"
  hardLockReason?: string | undefined
}

// ── Hằng số ─────────────────────────────────────────────────────────────────

const ALWAYS_ACTIVATED_CHANNELS: NotifyChannel[] = ["APP_INBOX"]
const DEFAULT_PRIORITY: NotifyPriority = "NORMAL"

/** Tổ chức nhận thông báo + tổ chức cấp trên (Chuỗi/Ngành) nếu có. */
export interface LockScope {
  storeOrgId: string
  parentOrgId?: string | undefined
}

/**
 * Khoá cứng chỉ áp cho đúng phạm vi đã đặt (AUD-014): MOTHER áp toàn sàn ("GLOBAL"),
 * INDUSTRY/CHAIN áp cho tổ chức đặt khoá và các cửa hàng trực thuộc, STORE chỉ cho chính cửa hàng.
 * Trước đây khoá của MỘT tổ chức áp cho MỌI tenant.
 */
export function isLockInScope(lock: HardLockEntry, scope: LockScope): boolean {
  if (lock.tier === "MOTHER") return lock.scopeId === "GLOBAL"
  if (lock.tier === "STORE") return lock.scopeId === scope.storeOrgId
  return lock.scopeId === scope.storeOrgId || (scope.parentOrgId !== undefined && lock.scopeId === scope.parentOrgId)
}

// ── Core resolve function ────────────────────────────────────────────────────

/**
 * Resolve effective notification preference theo luật Bottom-up Override + Hard Lock.
 *
 * Hàm này là pure function — không có side effects, không gọi DB.
 * Caller chịu trách nhiệm load dữ liệu từ DB và truyền vào.
 */
export function resolveCascadingPreference(input: ResolveCascadeInput): ResolveResult {
  const {
    eventKey,
    channel,
    channelActivations,
    hardLocks,
    userPreference,
    storeDefault,
    orgPolicy,
    motherDefault,
  } = input

  // ── GATE 1: Channel có được Mother kích hoạt chưa? ─────────────────────
  const isAlwaysActivated = ALWAYS_ACTIVATED_CHANNELS.includes(channel)
  const isActivated = isAlwaysActivated || channelActivations[channel] === true

  if (!isActivated) {
    return {
      enabled: false,
      priority: DEFAULT_PRIORITY,
      decidedBy: "CHANNEL_NOT_ACTIVATED",
    }
  }

  // ── GATE 2 + BOTTOM-UP: lõi chung `core/governance/layered-resolver` ──────
  // Khoá tầng cao nhất (trong phạm vi) thắng → User > Store > Org/Chain > Mother Default → tắt.
  const scope = { storeOrgId: input.storeOrgId, parentOrgId: input.parentOrgId }
  const locks = hardLocks
    .filter((l) => l.eventKey === eventKey && l.channel === channel && isLockInScope(l, scope))
    .map((l) => ({ tier: l.tier, value: l, source: `HARD_LOCK_${l.tier}` as ResolveResult["decidedBy"] }))
  const r = resolveLayered<NotificationSetting & { reason?: string | undefined }, ResolveResult["decidedBy"]>({
    locks,
    overrides: [
      { value: userPreference ?? undefined, source: "USER" },
      { value: storeDefault ?? undefined, source: "STORE" },
      { value: orgPolicy ?? undefined, source: "ORG" },
      { value: motherDefault ?? undefined, source: "MOTHER_DEFAULT" },
    ],
    // Không có setting nào → tắt theo mặc định an toàn
    fallback: { value: { enabled: false }, source: "SYSTEM_DEFAULT" },
  })

  if (r.lockedBy) {
    // Khoá cứng: ưu tiên luôn NORMAL, kèm lý do khoá
    return { enabled: r.value.enabled, priority: DEFAULT_PRIORITY, decidedBy: r.source, hardLockReason: r.value.reason }
  }
  return { enabled: r.value.enabled, priority: r.value.priority ?? DEFAULT_PRIORITY, decidedBy: r.source }
}

/**
 * Kiểm tra Hard Lock có áp dụng không — dùng cho UI
 * để quyết định hiện toggle hay badge "🔒 Bị khóa".
 */
export function getAppliedHardLock(
  hardLocks: HardLockEntry[],
  eventKey: string,
  channel: NotifyChannel,
  viewerTier: NotificationTier,
  scope: LockScope
): HardLockEntry | null {
  // Chỉ xét khoá của tầng TRÊN viewerTier; tầng cao nhất thắng (lõi chung)
  return winningLock(
    hardLocks.filter(
      (l) => isAbove(l.tier, viewerTier) && l.eventKey === eventKey && l.channel === channel && isLockInScope(l, scope)
    )
  )
}

/**
 * Khoá cứng chặn tuỳ chọn CÁ NHÂN của người dùng trong một cửa hàng: mọi khoá trong phạm vi, GỒM khoá tầng `STORE` của
 * chính cửa hàng (audit API §15) — người dùng đứng dưới mọi tầng tổ chức, khác `getAppliedHardLock` (chỉ tầng TRÊN tầng
 * đang xem). Cùng tập khoá `resolveCascade` áp khi gửi, nên tuỳ chọn đã lưu luôn có hiệu lực.
 */
export function getLockForUserPreference(
  hardLocks: HardLockEntry[],
  eventKey: string,
  channel: NotifyChannel,
  scope: LockScope
): HardLockEntry | null {
  return winningLock(hardLocks.filter((l) => l.eventKey === eventKey && l.channel === channel && isLockInScope(l, scope)))
}

/**
 * Kiểm tra một tầng có quyền đặt Hard Lock cho event/channel không.
 * Tầng X chỉ có thể hard lock nếu event đó thuộc scope hiển thị của tầng X.
 */
export function canTierSetHardLock(
  viewerTier: NotificationTier,
  _eventKey: string
): boolean {
  // Mọi tầng đều có thể hard lock events trong phạm vi của mình
  // Validation chi tiết hơn (event có visible với tier không) nằm ở use-case layer
  return viewerTier !== undefined
}
