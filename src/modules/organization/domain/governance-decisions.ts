/**
 * Quyết định của MỘT tầng trên ma trận quản trị (ưu đãi, cam kết, chính sách, thanh toán, phí gia công…).
 *
 * - `overrides[key]`: tầng này bật/tắt mục cho chính mình (ghi đè mặc định kế thừa).
 * - `locks[key]`: tầng này khoá cứng mục ở trạng thái `enabled` cho mọi tầng dưới.
 *
 * Thứ tự áp: Mẹ → Chuỗi → tầng đang xem. Khoá của tầng trên thắng mọi ghi đè/khoá của tầng dưới.
 * Pure — không phụ thuộc Prisma.
 */

import type { DecisionRecord } from "@/core/governance/decision-record"
import { resolveLayered, winningLock, type GovernanceTier } from "@/core/governance/layered-resolver"

export const GOVERNANCE_SYSTEMS = ["PROMOTIONS", "COMMITMENTS", "POLICIES", "PAYMENTS", "CRAFT_FEES", "TEMPLATES"] as const
export type GovernanceSystem = (typeof GOVERNANCE_SYSTEMS)[number]
export type GovernanceLayerTier = GovernanceTier

export type GovernanceLock = { enabled: boolean }
export type GovernanceDecisions = {
  overrides: Record<string, boolean>
  locks: Record<string, GovernanceLock>
}

export const MAX_GOVERNANCE_KEYS = 500
const KEY_RE = /^[A-Za-z0-9_.:-]{1,96}$/

export function isGovernanceSystem(v: unknown): v is GovernanceSystem {
  return typeof v === "string" && (GOVERNANCE_SYSTEMS as readonly string[]).includes(v)
}

export function emptyDecisions(): GovernanceDecisions {
  return { overrides: {}, locks: {} }
}

/** Đọc quyết định đã lưu (JSON tuỳ ý) thành dạng sạch; bỏ khoá sai định dạng. */
export function parseDecisions(raw: unknown): GovernanceDecisions {
  const out = emptyDecisions()
  if (!raw || typeof raw !== "object") return out
  const { overrides, locks } = raw as { overrides?: unknown; locks?: unknown }
  if (overrides && typeof overrides === "object") {
    for (const [k, v] of Object.entries(overrides)) if (KEY_RE.test(k) && typeof v === "boolean") out.overrides[k] = v
  }
  if (locks && typeof locks === "object") {
    for (const [k, v] of Object.entries(locks)) {
      const enabled = (v as { enabled?: unknown } | null)?.enabled
      if (KEY_RE.test(k) && typeof enabled === "boolean") out.locks[k] = { enabled }
    }
  }
  return out
}

/**
 * Quyết định của ma trận `system` dựng từ bản ghi `governance_decisions` hiện hành của MỘT phạm vi (ADR-012 T-7b):
 * `locked = false` là ghi đè, `locked = true` là khoá; dòng không đúng dạng `{enabled: boolean}` bị bỏ.
 */
export function decisionsFromRecords(records: readonly DecisionRecord[], system: GovernanceSystem): GovernanceDecisions {
  const out = emptyDecisions()
  for (const r of records) {
    const enabled = r.value?.["enabled"]
    if (r.system !== `matrix:${system}` || typeof enabled !== "boolean" || !KEY_RE.test(r.decisionKey)) continue
    if (r.locked) out.locks[r.decisionKey] = { enabled }
    else out.overrides[r.decisionKey] = enabled
  }
  return out
}

export type UpperLayer = { tier: GovernanceLayerTier; decisions: GovernanceDecisions }

/** Khoá đang áp xuống từ tầng trên (tầng cao nhất thắng; cùng tầng → đứng trước) — lõi `core/governance/layered-resolver`. */
export function upperLockFor(key: string, upper: readonly UpperLayer[]): { tier: GovernanceLayerTier; lock: GovernanceLock } | null {
  const candidates: { tier: GovernanceLayerTier; lock: GovernanceLock }[] = []
  for (const layer of upper) {
    const lock = layer.decisions.locks[key]
    if (lock) candidates.push({ tier: layer.tier, lock })
  }
  return winningLock(candidates)
}

export type DecisionViolation = { key: string; reason: "LOCKED_BY_UPPER" | "STORE_CANNOT_LOCK" | "BAD_KEY" | "TOO_MANY" }

/**
 * Kiểm quyết định mới của tầng đang xem trước khi lưu: không ghi đè/khoá mục tầng trên đã khoá,
 * cửa hàng không đặt khoá (không có tầng dưới), khoá đúng định dạng và có trần số lượng.
 */
export function validateDecisions(
  next: GovernanceDecisions,
  ownTier: GovernanceLayerTier,
  upper: readonly UpperLayer[]
): DecisionViolation[] {
  const violations: DecisionViolation[] = []
  const keys = [...Object.keys(next.overrides), ...Object.keys(next.locks)]
  if (keys.length > MAX_GOVERNANCE_KEYS) return [{ key: "*", reason: "TOO_MANY" }]
  for (const key of keys) {
    if (!KEY_RE.test(key)) violations.push({ key, reason: "BAD_KEY" })
    else if (upperLockFor(key, upper)) violations.push({ key, reason: "LOCKED_BY_UPPER" })
  }
  if (ownTier === "STORE") for (const key of Object.keys(next.locks)) violations.push({ key, reason: "STORE_CANNOT_LOCK" })
  return violations
}

export type EffectiveDecision = {
  enabled: boolean
  source: "UPPER_LOCK" | "OWN_LOCK" | "OWN_OVERRIDE" | "DEFAULT"
  lockedBy: GovernanceLayerTier | null
}

/** Trạng thái hiệu lực của một mục cho tầng đang xem: khoá tầng trên → khoá của mình → ghi đè → mặc định. */
export function effectiveDecision(
  key: string,
  defaultEnabled: boolean,
  own: GovernanceDecisions,
  ownTier: GovernanceLayerTier,
  upper: readonly UpperLayer[]
): EffectiveDecision {
  const up = upperLockFor(key, upper)
  const ownLock = own.locks[key]
  const r = resolveLayered<boolean, EffectiveDecision["source"]>({
    locks: [
      ...(up ? [{ tier: up.tier, value: up.lock.enabled, source: "UPPER_LOCK" as const }] : []),
      ...(ownLock ? [{ tier: ownTier, value: ownLock.enabled, source: "OWN_LOCK" as const }] : []),
    ],
    overrides: [{ value: key in own.overrides ? own.overrides[key] : undefined, source: "OWN_OVERRIDE" }],
    fallback: { value: defaultEnabled, source: "DEFAULT" },
  })
  return { enabled: r.value, source: r.source, lockedBy: r.lockedBy }
}

/** Các ma trận mà luồng bán hàng (trang khách, báo giá, đặt đơn) đọc khi lọc mục hiện cho khách. */
export const POLICY_SYSTEMS = ["PROMOTIONS", "COMMITMENTS", "POLICIES"] as const
export type PolicySystem = (typeof POLICY_SYSTEMS)[number]
/**
 * Ma trận cho luồng bán hàng: tầng trên theo hệ thống, kèm `own` — quyết định của chính tiệm (T-7b: đọc từ
 * `governance_decisions`, không còn từ `settings.governance_matrix`). Thiếu `own` = tiệm chưa có quyết định riêng.
 */
export type PolicyGovernanceUpper = Partial<Record<PolicySystem, UpperLayer[]>> & {
  readonly own?: Partial<Record<PolicySystem, GovernanceDecisions>> | undefined
}

/** Trần chiết khấu nền tảng (mục `MAX_DISCOUNT_PERCENT` của ma trận Ưu đãi). */
export const PLATFORM_MAX_DISCOUNT_PERCENT = 50

/**
 * Quy chuẩn bất biến của nền tảng — danh mục ma trận hiển thị là "Mẹ khoá cứng". Luôn đứng đầu các
 * tầng trên nên không tầng nào (kể cả quyết định Mẹ đã lưu) mở được.
 */
export const BUILT_IN_MOTHER_LOCKS: Partial<Record<GovernanceSystem, readonly string[]>> = {
  PROMOTIONS: ["MAX_DISCOUNT_PERCENT"],
  COMMITMENTS: ["MANDATORY_QC_PHOTO"],
  POLICIES: ["SLA_DISPUTE_24H"],
  PAYMENTS: ["VIETQR_PAYMENT_ENABLED"],
  CRAFT_FEES: ["MAX_PENALTY_DEDUCTION_30"],
}

export function builtInMotherLayer(system: GovernanceSystem): UpperLayer {
  const locks: Record<string, GovernanceLock> = {}
  for (const key of BUILT_IN_MOTHER_LOCKS[system] ?? []) locks[key] = { enabled: true }
  return { tier: "MOTHER", decisions: { overrides: {}, locks } }
}

/** Tầng trên đầy đủ: quy chuẩn bất biến trước, rồi các tầng đã lưu. */
export function withBuiltInLocks(system: GovernanceSystem, upper: readonly UpperLayer[]): UpperLayer[] {
  return [builtInMotherLayer(system), ...upper]
}

/** Mục của ma trận có đang bật cho tổ chức có quyết định riêng `own` này không (mặc định bật). */
export function isGovernedItemEnabled(
  key: string,
  own: GovernanceDecisions | undefined,
  system: GovernanceSystem,
  upper: readonly UpperLayer[] = []
): boolean {
  return effectiveDecision(key, true, own ?? emptyDecisions(), "STORE", withBuiltInLocks(system, upper)).enabled
}
