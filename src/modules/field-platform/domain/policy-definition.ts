/**
 * ALG Inputs Architecture v2.1 — Policy Definition & Rules
 *
 * Implements Policy Registry contracts, 4 merge modes:
 * - OVERRIDE: Nearest scope wins (subject to constraints and locks)
 * - RESTRICTIVE: Most restrictive value wins (tightest bound, fixes F-01)
 * - BOUNDED: Value clamped within intersections of upper limits
 * - ADDITIVE: Union of values, subtracting denied items
 */

export type PolicyMergeMode = "OVERRIDE" | "RESTRICTIVE" | "BOUNDED" | "ADDITIVE"

export type RestrictDirection = "MIN_VALUE" | "MAX_VALUE" | "SUBSET"

export type RiskClass = "R1_FINANCIAL_LEGAL" | "R2_OPERATIONAL" | "R3_PRESENTATIONAL"

export type TargetScopeLevel =
  | "STORE"
  | "CAPABILITY"
  | "COLLECTION"
  | "PRODUCT"
  | "VARIANT"
  | "ORDER_LINE"

export interface NumericBounds {
  readonly min?: number
  readonly max?: number
}

export interface PolicyDefinition {
  readonly policyKey: string
  readonly nameVi: string
  readonly nameEn: string
  readonly mergeMode: PolicyMergeMode
  readonly restrictDirection?: RestrictDirection
  readonly allowedScopes: readonly TargetScopeLevel[]
  readonly riskClass: RiskClass
  readonly lockedAt?: TargetScopeLevel
  readonly bounds?: NumericBounds
}

export function validatePolicyDefinition(policy: PolicyDefinition): string[] {
  const errors: string[] = []

  // R1 cannot be allowed on PRODUCT, VARIANT, or ORDER_LINE
  if (policy.riskClass === "R1_FINANCIAL_LEGAL") {
    const forbidden: TargetScopeLevel[] = ["PRODUCT", "VARIANT", "ORDER_LINE", "COLLECTION"]
    const hasForbidden = policy.allowedScopes.some((s) => forbidden.includes(s))
    if (hasForbidden) {
      errors.push(
        `Chính sách ${policy.policyKey} thuộc R1 (tài chính/pháp lý) không được phép đặt dưới cấp Store/Capability`
      )
    }
  }

  // RESTRICTIVE requires restrictDirection
  if (policy.mergeMode === "RESTRICTIVE" && !policy.restrictDirection) {
    errors.push(`Chính sách ${policy.policyKey} kiểu RESTRICTIVE bắt buộc khai báo restrictDirection`)
  }

  return errors
}
