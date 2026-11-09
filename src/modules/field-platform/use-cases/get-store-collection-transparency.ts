/**
 * SMEOS Inputs Architecture v2.1 — Store Collection Transparency Use-Case (§9.5.8)
 *
 * Allows a store to view all data items being collected by the chain,
 * their effective sharing format (RAW, MASKED, AGGREGATED), and the legal purpose.
 */

import {
  resolveStoreEffectiveTarget,
  type StoreContext,
} from "../domain/chain-collection-profile"
import { type PropagationTarget } from "../domain/field-registry-v2"
import { STANDARD_G1_CORE_FIELDS } from "../domain/standard-core-fields"
import { type IChainCollectionProfileRepository, getChainCollectionProfileRepository } from "../infra/chain-collection-repository"

export interface StoreCollectedItemView {
  readonly fieldKey: string
  readonly fieldNameVi: string
  readonly domain: string
  readonly sensitivity: string
  readonly effectiveFloor: PropagationTarget
  readonly effectiveCeiling: PropagationTarget
  readonly effectiveTarget: PropagationTarget
  readonly purpose?: string | undefined
  readonly isMandatory: boolean
}

export interface StoreCollectionTransparencyResult {
  readonly storeId: string
  readonly storeName: string
  readonly profileVersion: number
  readonly items: readonly StoreCollectedItemView[]
}

export async function getStoreCollectionTransparency(
  storeId: string,
  organizationId: string,
  repo: IChainCollectionProfileRepository = getChainCollectionProfileRepository()
): Promise<StoreCollectionTransparencyResult | null> {
  // 1. Fetch store/branch details
  const branch = await repo.findBranchBasic(storeId)
  // Cách ly tenant (09/11/2026, audit API §25): trước đây chi nhánh đọc theo id không lọc tổ chức — gửi mã chi nhánh
  // của tổ chức khác nhận về tên chi nhánh và mức trần DSA của tổ chức đó. Không thấy hoặc khác tổ chức → null (404),
  // và chỉ đọc DSA sau khi đã kiểm (cùng khuôn `getStoreFolderData`).
  if (!branch || branch.organization_id !== organizationId) return null

  const storeName = branch.name

  // 2. Fetch chain profile
  const profile = await repo.getProfile(organizationId)
  const dsa = await repo.getStoreDsa(storeId)

  const storeContext: StoreContext = {
    storeId,
    isSameLegalEntityAsOwner: !dsa, // If DSA exists, store has separate legal entity
  }

  const rules = profile?.rules ?? []
  const items: StoreCollectedItemView[] = []

  for (const field of STANDARD_G1_CORE_FIELDS) {
    if (!field.propagation.chainSelectable) continue

    const matchingRule = rules.find(
      (r) =>
        r.status === "ACTIVE" &&
        (r.fieldKey === field.fieldKey || (!r.fieldKey && r.domainKey === field.domain))
    )

    const resolution = resolveStoreEffectiveTarget({
      field,
      store: storeContext,
      matchingRule,
      dsa: dsa ?? undefined,
    })

    if (resolution.effectiveFloor !== "NONE" || resolution.effectiveTarget !== "NONE") {
      items.push({
        fieldKey: field.fieldKey,
        fieldNameVi: field.fieldName.vi,
        domain: field.domain,
        sensitivity: field.sensitivity,
        effectiveFloor: resolution.effectiveFloor,
        effectiveCeiling: resolution.effectiveCeiling,
        effectiveTarget: resolution.effectiveTarget,
        purpose: matchingRule?.purpose,
        isMandatory: matchingRule?.mandatoryForNewStore ?? false,
      })
    }
  }

  return {
    storeId,
    storeName,
    profileVersion: profile?.profileVersion ?? 1,
    items,
  }
}
