/**
 * ALG Inputs Architecture v2.1 — Policy Resolver Engine
 *
 * Implements the 3-step hierarchical resolution algorithm across Organization Tree
 * and Object Tree with fail-safe clamping.
 * Covers all CI test cases T1 to T7 (§6.3) and resolves F-01.
 */

import {
  type NumericBounds,
  type PolicyDefinition,
  type TargetScopeLevel,
} from "./policy-definition"

export interface PolicyValueEntry<T = unknown> {
  readonly scopeLevel: TargetScopeLevel | "PLATFORM" | "CHAIN"
  readonly value: T
  readonly effectiveFrom?: Date
  readonly effectiveTo?: Date
  readonly locked?: boolean
  readonly bounds?: NumericBounds
  readonly outOfBounds?: boolean
}

export interface ResolutionContext {
  readonly asOfDate: Date
}

export interface ResolvedPolicyResult<T = unknown> {
  readonly effectiveValue: T
  readonly resolvedScope: TargetScopeLevel | "PLATFORM" | "CHAIN"
  readonly clamped: boolean
  readonly provenance: readonly {
    readonly scope: string
    readonly rawValue: unknown
  }[]
  readonly warning?: string
}

export function isEffectiveAt(
  entry: PolicyValueEntry<unknown>,
  atDate: Date
): boolean {
  if (entry.effectiveFrom && atDate.getTime() < entry.effectiveFrom.getTime()) {
    return false
  }
  if (entry.effectiveTo && atDate.getTime() > entry.effectiveTo.getTime()) {
    return false
  }
  return true
}

export function resolvePolicyValue<T = unknown>(
  policy: PolicyDefinition,
  hierarchy: readonly PolicyValueEntry<T>[],
  ctx: ResolutionContext
): ResolvedPolicyResult<T> {
  // Filter active values by effective date
  const activeEntries = hierarchy.filter((entry) => isEffectiveAt(entry, ctx.asOfDate))

  if (activeEntries.length === 0) {
    throw new Error(`Không tìm thấy giá trị khả dụng cho chính sách ${policy.policyKey}`)
  }

  const provenance = activeEntries.map((e) => ({
    scope: e.scopeLevel,
    rawValue: e.value,
  }))

  const firstEntry = activeEntries[0]!
  const nearest = activeEntries[activeEntries.length - 1]!

  // 1. OVERRIDE Mode
  if (policy.mergeMode === "OVERRIDE") {
    // Check if locked at upper scope
    const lockEntry = activeEntries.find((e) => e.locked)
    if (lockEntry) {
      return {
        effectiveValue: lockEntry.value,
        resolvedScope: lockEntry.scopeLevel,
        clamped: false,
        provenance,
        warning: `Bị khóa bởi cấp ${lockEntry.scopeLevel}`,
      }
    }

    const value = nearest.value

    // If upper constraints (bounds) exist, validate / clamp
    const bounds = aggregateBounds(activeEntries)
    const clamped = false
    if (typeof value === "number" && bounds) {
      if (bounds.min !== undefined && value < bounds.min) {
        throw new Error(`Giá trị ${value} thấp hơn mức tối thiểu cho phép ${bounds.min}`)
      }
      if (bounds.max !== undefined && value > bounds.max) {
        throw new Error(`Giá trị ${value} vượt quá mức tối đa cho phép ${bounds.max}`)
      }
    }

    return {
      effectiveValue: value,
      resolvedScope: nearest.scopeLevel,
      clamped,
      provenance,
    }
  }

  // 2. RESTRICTIVE Mode (Fixes F-01: child cannot be looser than parent)
  if (policy.mergeMode === "RESTRICTIVE") {
    if (policy.restrictDirection === "MIN_VALUE") {
      let minVal = Number.POSITIVE_INFINITY
      let winningScope = firstEntry.scopeLevel

      for (const entry of activeEntries) {
        const num = Number(entry.value)
        if (num < minVal) {
          minVal = num
          winningScope = entry.scopeLevel
        }
      }

      return {
        effectiveValue: minVal as unknown as T,
        resolvedScope: winningScope,
        clamped: false,
        provenance,
      }
    }

    if (policy.restrictDirection === "MAX_VALUE") {
      let maxVal = Number.NEGATIVE_INFINITY
      let winningScope = firstEntry.scopeLevel

      for (const entry of activeEntries) {
        const num = Number(entry.value)
        if (num > maxVal) {
          maxVal = num
          winningScope = entry.scopeLevel
        }
      }

      return {
        effectiveValue: maxVal as unknown as T,
        resolvedScope: winningScope,
        clamped: false,
        provenance,
      }
    }
  }

  // 3. BOUNDED Mode (Value clamped into intersection of all limits)
  if (policy.mergeMode === "BOUNDED") {
    const num = Number(nearest.value)
    const bounds = aggregateBounds(activeEntries)

    let finalVal = num
    let clamped = false

    if (bounds?.min !== undefined && finalVal < bounds.min) {
      finalVal = bounds.min
      clamped = true
    }
    if (bounds?.max !== undefined && finalVal > bounds.max) {
      finalVal = bounds.max
      clamped = true
    }

    const res: ResolvedPolicyResult<T> = {
      effectiveValue: finalVal as unknown as T,
      resolvedScope: nearest.scopeLevel,
      clamped,
      provenance,
    }
    if (clamped) {
      return {
        ...res,
        warning: "Giá trị tự động kẹp (clamp) theo giới hạn cấp trên",
      }
    }
    return res
  }

  // 4. ADDITIVE Mode (Union minus excluded)
  if (policy.mergeMode === "ADDITIVE") {
    const set = new Set<string>()
    for (const entry of activeEntries) {
      if (Array.isArray(entry.value)) {
        for (const item of entry.value) {
          set.add(String(item))
        }
      }
    }
    return {
      effectiveValue: Array.from(set) as unknown as T,
      resolvedScope: nearest.scopeLevel,
      clamped: false,
      provenance,
    }
  }

  throw new Error(`Kiểu merge ${policy.mergeMode} chưa được hỗ trợ`)
}

function aggregateBounds(entries: readonly PolicyValueEntry<unknown>[]): NumericBounds | undefined {
  let min: number | undefined
  let max: number | undefined

  for (const entry of entries) {
    if (entry.bounds?.min !== undefined) {
      min = min !== undefined ? Math.max(min, entry.bounds.min) : entry.bounds.min
    }
    if (entry.bounds?.max !== undefined) {
      max = max !== undefined ? Math.min(max, entry.bounds.max) : entry.bounds.max
    }
  }

  if (min === undefined && max === undefined) {
    return undefined
  }
  const result: { min?: number; max?: number } = {}
  if (min !== undefined) result.min = min
  if (max !== undefined) result.max = max
  return result
}
