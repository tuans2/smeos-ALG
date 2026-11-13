/**
 * ALG Inputs Architecture v2.1 — Get Chain Collection Profile Use-Case (§9.5.8)
 */

import {
  type ChainCollectionProfile,
  type CollectionRule,
} from "../domain/chain-collection-profile"
import { STANDARD_G1_CORE_FIELDS } from "../domain/standard-core-fields"
import { type FieldDefinitionV2 } from "../domain/field-registry-v2"
import { type IChainCollectionProfileRepository } from "../infra/chain-collection-repository"

export interface GetChainCollectionProfileResult {
  readonly profile: ChainCollectionProfile
  readonly collectableFields: readonly FieldDefinitionV2[]
}

export function buildDefaultRules(fields: readonly FieldDefinitionV2[]): readonly CollectionRule[] {
  return fields
    .filter((f) => f.propagation.chainSelectable && f.sensitivity !== "S3_SECRET")
    .map((f, index) => ({
      ruleId: `rule-default-${index + 1}`,
      fieldKey: f.fieldKey,
      domainKey: f.domain,
      minForm: f.propagation.chainDefault ? f.propagation.toChain : "NONE",
      maxForm: f.propagation.ceiling.toChain,
      purpose: f.sensitivity === "S2_CONFIDENTIAL" || f.pii.isPii ? "Quản lý và vận hành chuỗi" : undefined,
      scope: { type: "ALL_STORES" },
      mandatoryForNewStore: f.requiredStage === "G1",
      status: "ACTIVE",
    }))
}

export async function getChainCollectionProfile(
  organizationId: string,
  repo: IChainCollectionProfileRepository
): Promise<GetChainCollectionProfileResult> {
  const collectableFields = STANDARD_G1_CORE_FIELDS.filter(
    (f) => f.propagation.chainSelectable && f.sensitivity !== "S3_SECRET"
  )

  const existing = await repo.getProfile(organizationId)

  if (existing) {
    return {
      profile: existing,
      collectableFields,
    }
  }

  // Generate initial v1 profile based on Core pack defaults
  const defaultProfile: ChainCollectionProfile = {
    organizationId,
    profileVersion: 1,
    status: "ACTIVE",
    rules: buildDefaultRules(collectableFields),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  }

  return {
    profile: defaultProfile,
    collectableFields,
  }
}
