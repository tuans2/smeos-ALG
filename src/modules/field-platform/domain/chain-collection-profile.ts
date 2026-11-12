/**
 * ALG Inputs Architecture v2.1 — Chain Collection Profile (§9.5.8)
 *
 * Implements:
 * 1. CollectionRule: selector, min_form (floor), max_form (chain ceiling), scope, status
 * 2. ChainCollectionProfile: versioned collection configuration
 * 3. DataSharingAgreement (DSA): constraints for partner/franchise stores
 * 4. Formula resolution (§9.5.8 d):
 *    effectiveCeiling = min(fieldCeiling, dsaCeiling, maxForm)
 *    effectiveFloor   = max(minForm applied)
 *    effectiveTarget  = min(effectiveCeiling, max(effectiveFloor, storeChoice))
 * 5. Validation: S3 fields strictly rejected, floor cannot exceed effective ceiling,
 *    S2 fields require explicit purpose.
 */

import { type PropagationTarget, type FieldDefinitionV2 } from "./field-registry-v2"
import { PROPAGATION_RANK, rankToTarget } from "./data-propagation-hub"
import { type InputDomainKey } from "./input-domains"

export type CollectionRuleStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED"

export type BackfillOption = "NONE" | "FROM_EFFECTIVE" | "FULL"

export interface CollectionScope {
  readonly type: "ALL_STORES" | "BRAND" | "REGION" | "SPECIFIC_STORES"
  readonly targetIds?: readonly string[] | undefined
}

export interface CollectionRule {
  readonly ruleId: string
  readonly fieldKey?: string | undefined
  readonly domainKey?: InputDomainKey | undefined
  readonly minForm: PropagationTarget
  readonly maxForm?: PropagationTarget | undefined
  readonly purpose?: string | undefined
  readonly scope: CollectionScope
  readonly effectiveFrom?: string | undefined
  readonly backfill?: BackfillOption | undefined
  readonly mandatoryForNewStore: boolean
  readonly status: CollectionRuleStatus
}

export interface ChainCollectionProfile {
  readonly organizationId: string
  readonly profileVersion: number
  readonly status: "DRAFT" | "ACTIVE" | "ARCHIVED"
  readonly rules: readonly CollectionRule[]
  readonly updatedAt: string
  readonly publishedAt?: string | undefined
}

export interface DataSharingAgreement {
  readonly storeId: string
  readonly legalEntityId: string
  readonly fieldCeilings: Readonly<Record<string, PropagationTarget>>
  readonly validUntil: string
  readonly status: "ACTIVE" | "EXPIRED" | "TERMINATED"
}

export interface StoreContext {
  readonly storeId: string
  readonly brandId?: string | undefined
  readonly regionId?: string | undefined
  readonly legalEntityId?: string | undefined
  readonly isSameLegalEntityAsOwner: boolean
}

export interface ProfileValidationIssue {
  readonly fieldKey?: string | undefined
  readonly ruleId?: string | undefined
  readonly code:
    | "S3_NOT_SELECTABLE"
    | "FLOOR_EXCEEDS_CEILING"
    | "PURPOSE_REQUIRED_FOR_S2"
    | "DSA_CEILING_VIOLATED"
  readonly message: string
}

export interface ProfileValidationResult {
  readonly isValid: boolean
  readonly issues: readonly ProfileValidationIssue[]
}

/**
 * Validate a Chain Collection Profile against Field Registry and Store DSAs.
 */
export function validateCollectionProfile(
  rules: readonly CollectionRule[],
  fields: readonly FieldDefinitionV2[],
  dsas?: readonly DataSharingAgreement[] | undefined
): ProfileValidationResult {
  const issues: ProfileValidationIssue[] = []
  const fieldMap = new Map(fields.map((f) => [f.fieldKey, f]))

  for (const rule of rules) {
    if (rule.status !== "ACTIVE" && rule.status !== "DRAFT") continue

    // Resolve matching fields
    const matchingFields = rule.fieldKey
      ? [fieldMap.get(rule.fieldKey)].filter(Boolean) as FieldDefinitionV2[]
      : fields.filter((f) => f.domain === rule.domainKey)

    for (const field of matchingFields) {
      // 1. S3 strictly prohibited
      if (field.sensitivity === "S3_SECRET" || !field.propagation.chainSelectable) {
        issues.push({
          fieldKey: field.fieldKey,
          ruleId: rule.ruleId,
          code: "S3_NOT_SELECTABLE",
          message: `Trường ${field.fieldKey} có độ nhạy S3 hoặc không được phép chọn vào danh mục thu thập chuỗi.`,
        })
        continue
      }

      // 2. Purpose required for S2 / PII
      if ((field.sensitivity === "S2_CONFIDENTIAL" || field.pii.isPii) && !rule.purpose?.trim()) {
        issues.push({
          fieldKey: field.fieldKey,
          ruleId: rule.ruleId,
          code: "PURPOSE_REQUIRED_FOR_S2",
          message: `Trường bảo mật S2/PII (${field.fieldKey}) bắt buộc phải khai báo mục đích thu thập.`,
        })
      }

      // 3. Floor cannot exceed field's inherent ceiling
      const floorRank = PROPAGATION_RANK[rule.minForm]
      const fieldCeilingRank = PROPAGATION_RANK[field.propagation.ceiling.toChain]
      if (floorRank > fieldCeilingRank) {
        issues.push({
          fieldKey: field.fieldKey,
          ruleId: rule.ruleId,
          code: "FLOOR_EXCEEDS_CEILING",
          message: `Sàn yêu cầu (${rule.minForm}) vượt trần tối đa của trường ${field.fieldKey} (${field.propagation.ceiling.toChain}).`,
        })
      }

      // 4. Check against DSAs if available
      if (dsas) {
        for (const dsa of dsas) {
          if (dsa.status !== "ACTIVE") continue
          const dsaCeiling = dsa.fieldCeilings[field.fieldKey]
          if (dsaCeiling && floorRank > PROPAGATION_RANK[dsaCeiling]) {
            issues.push({
              fieldKey: field.fieldKey,
              ruleId: rule.ruleId,
              code: "DSA_CEILING_VIOLATED",
              message: `Sàn yêu cầu (${rule.minForm}) vượt trần thỏa thuận DSA (${dsaCeiling}) với cửa hàng ${dsa.storeId}.`,
            })
          }
        }
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * Formula §9.5.8 d:
 * Calculate effective propagation target for a store and field.
 */
export function resolveStoreEffectiveTarget(params: {
  readonly field: FieldDefinitionV2
  readonly store: StoreContext
  readonly matchingRule?: CollectionRule | undefined
  readonly dsa?: DataSharingAgreement | undefined
  readonly storeChoice?: PropagationTarget | undefined
}): {
  readonly effectiveCeiling: PropagationTarget
  readonly effectiveFloor: PropagationTarget
  readonly effectiveTarget: PropagationTarget
  readonly isAllowed: boolean
} {
  const { field, store, matchingRule, dsa, storeChoice = "NONE" } = params

  // 1. Calculate ceiling
  let ceilingRank = PROPAGATION_RANK[field.propagation.ceiling.toChain]

  // If store is partner / different legal entity, check DSA
  if (!store.isSameLegalEntityAsOwner && dsa) {
    const dsaCeiling = dsa.fieldCeilings[field.fieldKey]
    if (dsaCeiling) {
      ceilingRank = Math.min(ceilingRank, PROPAGATION_RANK[dsaCeiling])
    }
  }

  if (matchingRule?.maxForm) {
    ceilingRank = Math.min(ceilingRank, PROPAGATION_RANK[matchingRule.maxForm])
  }

  // 2. Calculate floor
  const floorRank = matchingRule ? PROPAGATION_RANK[matchingRule.minForm] : 0

  if (floorRank > ceilingRank) {
    return {
      effectiveCeiling: rankToTarget(ceilingRank),
      effectiveFloor: rankToTarget(floorRank),
      effectiveTarget: "NONE",
      isAllowed: false,
    }
  }

  // 3. Effective target = min(ceiling, max(floor, storeChoice))
  const choiceRank = PROPAGATION_RANK[storeChoice]
  const targetRank = Math.min(ceilingRank, Math.max(floorRank, choiceRank))

  return {
    effectiveCeiling: rankToTarget(ceilingRank),
    effectiveFloor: rankToTarget(floorRank),
    effectiveTarget: rankToTarget(targetRank),
    isAllowed: true,
  }
}
