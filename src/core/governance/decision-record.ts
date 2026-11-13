/**
 * Bản ghi của bảng quyết định theo tầng `governance_decisions` (ADR-012 D-T10, bước T-7a).
 *
 * Một quyết định được nhận diện bằng (`system`, `decisionKey`, `tier`, `scope`, `locked`). Bảng chỉ thêm dòng; dòng
 * hiện hành là dòng mới nhất; `value` null = quyết định đã gỡ. Ba nơi lưu cũ đổi sang bản ghi bằng các hàm dưới đây —
 * cùng quy ước với phần chép trong migration `*_governance_decisions`.
 *
 * Thuần: không import Prisma.
 */
import type { GovernanceTier } from "./layered-resolver"
import { toScopeKey } from "./scope-key"

export type DecisionSystem = `matrix:${string}` | "notification.hard_lock" | "notification.visibility" | "integration"

/** Giá trị JSON của một quyết định (đối tượng phẳng, không lồng). */
export type DecisionValue = Readonly<Record<string, string | number | boolean | null>>

export interface DecisionIdentity {
  readonly system: DecisionSystem
  readonly decisionKey: string
  readonly tier: GovernanceTier
  /** Địa chỉ phạm vi D-T5 (`platform`, `industry:<key>`, `org:<id>`, `branch:<id>`). */
  readonly scope: string
  readonly locked: boolean
}

export interface DecisionRecord extends DecisionIdentity {
  readonly value: DecisionValue | null
  readonly decidedBy: string | null
}

export function identityKey(d: DecisionIdentity): string {
  return [d.system, d.decisionKey, d.tier, d.scope, d.locked ? "1" : "0"].join("|")
}

/** So hai giá trị không phụ thuộc thứ tự khoá (JSONB không giữ thứ tự). */
export function sameDecisionValue(a: DecisionValue | null, b: DecisionValue | null): boolean {
  if (a === null || b === null) return a === b
  const ka = Object.keys(a).sort()
  const kb = Object.keys(b).sort()
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k])
}

/**
 * Bản ghi cần thêm để tập quyết định của một phạm vi thành `desired`: quyết định mới hoặc đổi giá trị → một dòng;
 * quyết định đang có mà `desired` không còn → một dòng gỡ (`value` null). Không đổi gì → không thêm dòng.
 */
export function diffDecisions(
  current: readonly DecisionRecord[],
  desired: readonly DecisionRecord[],
): DecisionRecord[] {
  const now = new Map(current.filter((c) => c.value !== null).map((c) => [identityKey(c), c]))
  const out: DecisionRecord[] = []
  const wanted = new Set<string>()
  for (const d of desired) {
    const key = identityKey(d)
    wanted.add(key)
    const before = now.get(key)
    if (!before || !sameDecisionValue(before.value, d.value)) out.push(d)
  }
  for (const [key, c] of now) {
    if (!wanted.has(key)) out.push({ ...c, value: null, decidedBy: desired[0]?.decidedBy ?? c.decidedBy })
  }
  return out
}

/** Ma trận quản trị của một tầng (`overrides` + `locks`) → bản ghi; tầng Mẹ có phạm vi `platform`. */
export function matrixRecords(input: {
  readonly system: string
  readonly tier: GovernanceTier
  readonly scope: string
  readonly decisions: { readonly overrides: Readonly<Record<string, boolean>>; readonly locks: Readonly<Record<string, { readonly enabled: boolean }>> }
  readonly decidedBy: string | null
}): DecisionRecord[] {
  const base = { system: `matrix:${input.system}` as const, tier: input.tier, scope: input.scope, decidedBy: input.decidedBy }
  return [
    ...Object.entries(input.decisions.overrides).map(([decisionKey, enabled]) => ({ ...base, decisionKey, locked: false, value: { enabled } })),
    ...Object.entries(input.decisions.locks).map(([decisionKey, l]) => ({ ...base, decisionKey, locked: true, value: { enabled: l.enabled } })),
  ]
}

/** Khoá cứng thông báo; `enabled` null = gỡ khoá. `scopeId` ở dạng domain ("GLOBAL", id tổ chức) hoặc D-T5. */
export function notificationLockRecord(input: {
  readonly eventKey: string
  readonly channel: string
  readonly tier: GovernanceTier
  readonly scopeId: string
  readonly enabled: boolean | null
  readonly reason?: string | null | undefined
  readonly decidedBy: string | null
}): DecisionRecord {
  return {
    system: "notification.hard_lock",
    decisionKey: `${input.eventKey}:${input.channel}`,
    tier: input.tier,
    scope: toScopeKey(input.scopeId),
    locked: true,
    value: input.enabled === null ? null : { enabled: input.enabled, reason: input.reason ?? null },
    decidedBy: input.decidedBy,
  }
}

/** Mẹ ẩn/hiện một sự kiện thông báo ở một tầng dưới. */
export function notificationVisibilityRecord(input: {
  readonly eventKey: string
  readonly targetTier: string
  readonly visible: boolean
  readonly decidedBy: string | null
}): DecisionRecord {
  return {
    system: "notification.visibility",
    decisionKey: `${input.eventKey}:${input.targetTier}`,
    tier: "MOTHER",
    scope: toScopeKey("GLOBAL"),
    locked: false,
    value: { visible: input.visible },
    decidedBy: input.decidedBy,
  }
}

/** Khoá tích hợp; `ALLOW_OWN` là mặc định nên thành dòng gỡ. */
export function integrationRecord(input: {
  readonly connectorKey: string
  readonly tier: GovernanceTier
  readonly scopeId: string
  readonly mode: "FORBID" | "INHERIT_ONLY" | "ALLOW_OWN"
  readonly decidedBy: string | null
}): DecisionRecord {
  return {
    system: "integration",
    decisionKey: input.connectorKey,
    tier: input.tier,
    scope: toScopeKey(input.scopeId),
    locked: true,
    value: input.mode === "ALLOW_OWN" ? null : { mode: input.mode },
    decidedBy: input.decidedBy,
  }
}
