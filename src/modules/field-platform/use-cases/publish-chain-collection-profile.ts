/**
 * ALG Inputs Architecture v2.1 — Publish Chain Collection Profile Use-Case (§9.5.8)
 */

import { unprocessable } from "@/core/http/errors"
import {
  validateCollectionProfile,
  type ChainCollectionProfile,
  type CollectionRule,
} from "../domain/chain-collection-profile"
import { STANDARD_G1_CORE_FIELDS } from "../domain/standard-core-fields"
import { type IChainCollectionProfileRepository } from "../infra/chain-collection-repository"

export interface PublishChainCollectionProfileInput {
  readonly organizationId: string
  readonly rules: readonly CollectionRule[]
  readonly publishedBy: string
}

export async function publishChainCollectionProfile(
  input: PublishChainCollectionProfileInput,
  repo: IChainCollectionProfileRepository
): Promise<ChainCollectionProfile> {
  const { organizationId, rules } = input

  // 1. Validate rules
  const dsas = await repo.listActiveDsas(organizationId)
  const validation = validateCollectionProfile(rules, STANDARD_G1_CORE_FIELDS, dsas)

  if (!validation.isValid) {
    // Vi phạm luật nghiệp vụ → 422 kèm từng lỗi (audit API §17 — trước đây `Error` trần → 500)
    const errorDetails = validation.issues.map((i) => i.message).join("; ")
    throw unprocessable(`Cấu hình thu thập không hợp lệ: ${errorDetails}`, { issues: validation.issues })
  }

  // 2. Fetch existing profile to increment immutable version
  const current = await repo.getProfile(organizationId)
  const nextVersion = (current?.profileVersion ?? 0) + 1

  const publishedProfile: ChainCollectionProfile = {
    organizationId,
    profileVersion: nextVersion,
    status: "ACTIVE",
    rules,
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  }

  // 3. Persist
  await repo.saveProfile(publishedProfile)

  return publishedProfile
}
