/**
 * ALG Inputs Architecture v2.1 — Data Propagation Hub (§9.5)
 *
 * Implements:
 * 1. Effective sharing target calculation:
 *    effectiveCeiling = min(fieldCeiling, programScope, consentScope)
 *    effectiveTarget = min(effectiveCeiling, max(floorByParent, choiceByStore))
 * 2. Strict ordering: NONE (0) < AGGREGATED (1) < MASKED (2) < RAW (3)
 * 3. Validation: If floorByParent > effectiveCeiling, configuration is rejected at publish time.
 * 4. Data masking transformation engine for S2/PII.
 */

import { type PropagationTarget } from "./field-registry-v2"

export const PROPAGATION_RANK: Record<PropagationTarget, number> = {
  NONE: 0,
  AGGREGATED: 1,
  MASKED: 2,
  RAW: 3,
}

export function rankToTarget(rank: number): PropagationTarget {
  switch (rank) {
    case 0:
      return "NONE"
    case 1:
      return "AGGREGATED"
    case 2:
      return "MASKED"
    case 3:
      return "RAW"
    default:
      return "NONE"
  }
}

export interface PropagationResolutionInput {
  readonly fieldCeiling: PropagationTarget
  readonly programScope?: PropagationTarget | undefined
  readonly consentScope?: PropagationTarget | undefined
  readonly floorByParent: PropagationTarget
  readonly choiceByStore: PropagationTarget
}

export interface PropagationResolutionResult {
  readonly effectiveCeiling: PropagationTarget
  readonly effectiveTarget: PropagationTarget
  readonly isValid: boolean
  readonly error?: string | undefined
}

export function resolvePropagationTarget(
  input: PropagationResolutionInput
): PropagationResolutionResult {
  // 1. Calculate effective ceiling = min(fieldCeiling, programScope, consentScope)
  let ceilingRank = PROPAGATION_RANK[input.fieldCeiling]

  if (input.programScope) {
    ceilingRank = Math.min(ceilingRank, PROPAGATION_RANK[input.programScope])
  }
  if (input.consentScope) {
    ceilingRank = Math.min(ceilingRank, PROPAGATION_RANK[input.consentScope])
  }

  const effectiveCeiling = rankToTarget(ceilingRank)

  // 2. Floor must not exceed effective ceiling
  const floorRank = PROPAGATION_RANK[input.floorByParent]
  if (floorRank > ceilingRank) {
    return {
      effectiveCeiling,
      effectiveTarget: "NONE",
      isValid: false,
      error: `Sàn do cấp trên đặt (${input.floorByParent}) vượt quá trần cho phép (${effectiveCeiling})`,
    }
  }

  // 3. effectiveTarget = min(ceilingRank, max(floorRank, choiceRank))
  const choiceRank = PROPAGATION_RANK[input.choiceByStore]
  const targetRank = Math.min(ceilingRank, Math.max(floorRank, choiceRank))
  const effectiveTarget = rankToTarget(targetRank)

  return {
    effectiveCeiling,
    effectiveTarget,
    isValid: true,
  }
}

/**
 * Data Masking Engine: transforms raw value according to effectiveTarget.
 */
export function transformForPropagation<T>(
  rawValue: T,
  target: PropagationTarget,
  maskRule?: "MASK_MIDDLE" | "HASH" | "ROUND_NUMBER" | "REDACT"
): unknown {
  if (target === "NONE") {
    return undefined
  }
  if (target === "RAW") {
    return rawValue
  }
  if (target === "AGGREGATED") {
    // Return aggregated representation (e.g., boolean exists or bucket)
    if (typeof rawValue === "number") {
      return Math.round(rawValue / 1000) * 1000 // Rounding to nearest thousand
    }
    return "[AGGREGATED]"
  }
  if (target === "MASKED") {
    if (typeof rawValue === "string") {
      if (maskRule === "MASK_MIDDLE" && rawValue.length > 4) {
        const start = rawValue.slice(0, 2)
        const end = rawValue.slice(-2)
        return `${start}****${end}`
      }
      return "***PROTECTED***"
    }
    return "[MASKED]"
  }
  return undefined
}
