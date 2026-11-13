/**
 * ALG Inputs Architecture v2.1 — Preview Chain Collection Profile Use-Case (§9.5.8)
 */

import {
  validateCollectionProfile,
  type CollectionRule,
  type ProfileValidationResult,
} from "../domain/chain-collection-profile"
import { STANDARD_G1_CORE_FIELDS } from "../domain/standard-core-fields"
import { type IChainCollectionProfileRepository, getChainCollectionProfileRepository } from "../infra/chain-collection-repository"

export interface PreviewChainCollectionProfileResult {
  readonly validation: ProfileValidationResult
  readonly affectedStoreCount: number
  readonly riskLevel: "R1_HIGH_RISK" | "R2_STANDARD_RISK"
  readonly summary: {
    readonly activeRuleCount: number
    readonly s2FieldsCollected: number
    readonly floorRawCount: number
  }
}

export async function previewChainCollectionProfile(
  organizationId: string,
  rules: readonly CollectionRule[],
  repo: IChainCollectionProfileRepository = getChainCollectionProfileRepository()
): Promise<PreviewChainCollectionProfileResult> {
  const dsas = await repo.listActiveDsas(organizationId)
  const validation = validateCollectionProfile(rules, STANDARD_G1_CORE_FIELDS, dsas)

  // Count active branches
  const affectedStoreCount = await repo.countActiveBranches(organizationId)

  // Detect R1 vs R2 risk according to §9.5.8 e
  const fieldMap = new Map(STANDARD_G1_CORE_FIELDS.map((f) => [f.fieldKey, f]))
  let s2FieldsCollected = 0
  let floorRawCount = 0

  for (const rule of rules) {
    if (rule.status !== "ACTIVE") continue
    if (rule.minForm === "RAW") floorRawCount++

    const field = rule.fieldKey ? fieldMap.get(rule.fieldKey) : undefined
    if (field && (field.sensitivity === "S2_CONFIDENTIAL" || field.pii.isPii)) {
      if (rule.minForm !== "NONE") {
        s2FieldsCollected++
      }
    }
  }

  // R1 if collecting S2/PII or partner stores with DSAs exist
  const hasPartnerStore = dsas.length > 0
  const riskLevel =
    s2FieldsCollected > 0 || hasPartnerStore ? "R1_HIGH_RISK" : "R2_STANDARD_RISK"

  return {
    validation,
    affectedStoreCount,
    riskLevel,
    summary: {
      activeRuleCount: rules.filter((r) => r.status === "ACTIVE").length,
      s2FieldsCollected,
      floorRawCount,
    },
  }
}
