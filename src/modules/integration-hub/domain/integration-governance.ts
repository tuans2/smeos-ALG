/**
 * Khoá / cấp sẵn tích hợp theo tầng (GĐ3) — luật thuần, dùng lõi `resolveLayered`.
 *
 * Một dòng `(connector, tier, scope)` do tầng `tier` đặt, áp cho MỌI tầng dưới trong phạm vi `scope`:
 *   MOTHER → scope "GLOBAL" · INDUSTRY → "industry:<key>" (D4: ngành là mã, không phải tổ chức) · CHAIN → id tổ chức chuỗi.
 * Chế độ: FORBID (cấm dùng) · INHERIT_ONLY (chỉ dùng kết nối tầng trên cấp) · ALLOW_OWN (được tự kết nối — mặc định).
 * Tầng trên đã FORBID/INHERIT_ONLY thì tầng dưới không đặt lại được (khoá cao nhất thắng).
 */

import { isAbove, resolveLayered, type GovernanceTier, type LayeredDecision } from "@/core/governance/layered-resolver"

export type GovernanceMode = "FORBID" | "INHERIT_ONLY" | "ALLOW_OWN"

export interface GovernanceRow {
  readonly connectorKey: string
  readonly tier: GovernanceTier
  readonly scopeId: string
  readonly mode: GovernanceMode
}

/** Phạm vi của một tổ chức: ngành của nó và chuỗi mà nó là đối tác (nếu có). */
export interface OrgGovernanceScope {
  readonly industryKey: string | null
  readonly parentChainOrgId: string | null
}

export const GLOBAL_SCOPE = "GLOBAL"
export const industryScope = (key: string) => `industry:${key}`

/** Các phạm vi tầng trên áp lên một tổ chức, cao → thấp. */
export function upperScopesOf(scope: OrgGovernanceScope): Array<{ tier: GovernanceTier; scopeId: string }> {
  return [
    { tier: "MOTHER", scopeId: GLOBAL_SCOPE },
    ...(scope.industryKey ? [{ tier: "INDUSTRY" as const, scopeId: industryScope(scope.industryKey) }] : []),
    ...(scope.parentChainOrgId ? [{ tier: "CHAIN" as const, scopeId: scope.parentChainOrgId }] : []),
  ]
}

/** Chế độ hiệu lực của một đầu nối với tổ chức có phạm vi `scope`. Chỉ khoá (không phải ALLOW_OWN) mới là khoá. */
export function effectiveMode(
  connectorKey: string,
  scope: OrgGovernanceScope,
  rows: readonly GovernanceRow[]
): LayeredDecision<GovernanceMode, string> {
  const applicable = new Set(upperScopesOf(scope).map((s) => `${s.tier}|${s.scopeId}`))
  const locks = rows
    .filter((r) => r.connectorKey === connectorKey && r.mode !== "ALLOW_OWN" && applicable.has(`${r.tier}|${r.scopeId}`))
    .map((r) => ({ tier: r.tier, value: r.mode, source: `${r.tier}:${r.scopeId}` }))
  return resolveLayered({ locks, overrides: [], fallback: { value: "ALLOW_OWN" as GovernanceMode, source: "DEFAULT" } })
}

export type GovernanceViolation = "STORE_CANNOT_LOCK" | "LOCKED_BY_UPPER" | "NOT_GOVERNABLE"

/**
 * Tầng `editorTier` (phạm vi `editorScope` của chính nó) có được đặt chế độ cho tầng dưới không.
 * `upperRows` là các dòng của tầng TRÊN editor áp lên phạm vi đó.
 */
export function validateGovernanceChange(input: {
  editorTier: GovernanceTier
  editorScope: OrgGovernanceScope
  connectorKey: string
  governable: boolean
  rows: readonly GovernanceRow[]
}): GovernanceViolation | null {
  if (input.editorTier === "STORE") return "STORE_CANNOT_LOCK"
  if (!input.governable) return "NOT_GOVERNABLE"
  const upper = effectiveMode(input.connectorKey, input.editorScope, input.rows)
  if (upper.lockedBy && isAbove(upper.lockedBy, input.editorTier)) return "LOCKED_BY_UPPER"
  return null
}
