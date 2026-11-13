/**
 * ALG Inputs Architecture v2.1 — Get Chain Stores Data Summary
 *
 * Fetches all branches/stores for an organization and returns summary
 * statistics for the store card tiles in /du-lieu.
 */

import { STANDARD_G1_CORE_FIELDS } from "../domain/standard-core-fields"
import { ChainCollectionProfileRepository, getChainCollectionProfileRepository, type IChainCollectionProfileRepository } from "../infra/chain-collection-repository"

export interface ChainStoreSummary {
  readonly id: string
  readonly name: string
  readonly code: string
  readonly address: string | null
  readonly isActive: boolean
  readonly createdAt: string
  readonly collectedFieldCount: number
  readonly totalFieldCount: number
  readonly readinessPercentage: number
  readonly inventoryItemCount: number
  readonly isPartner: boolean
}

export interface GetChainStoresDataResult {
  readonly organizationId: string
  readonly stores: readonly ChainStoreSummary[]
  readonly totalStores: number
  readonly activeStores: number
}

export async function getChainStoresData(
  organizationId: string,
  repo: IChainCollectionProfileRepository = getChainCollectionProfileRepository()
): Promise<GetChainStoresDataResult> {
  const branches = await repo.listBranchesWithInventory(organizationId)
  const profile = await repo.getProfile(organizationId)
  const activeRules = profile?.rules.filter((r) => r.status === "ACTIVE") ?? []
  const dsas = await repo.listActiveDsas(organizationId)
  const dsaStoreIds = new Set(dsas.map((d) => d.storeId))

  const totalCollectable = STANDARD_G1_CORE_FIELDS.filter(
    (f) => f.propagation.chainSelectable
  ).length

  const stores: ChainStoreSummary[] = branches.map((b) => {
    // Collected fields that are not NONE
    const collectedCount = activeRules.filter(
      (r) => r.minForm !== "NONE" || (r.maxForm && r.maxForm !== "NONE")
    ).length

    // Readiness calculation based on having address and inventory
    let score = 60
    if (b.address) score += 20
    if (b._count.inventory > 0) score += 20

    return {
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      isActive: b.is_active,
      createdAt: b.created_at.toISOString(),
      collectedFieldCount: collectedCount || 12,
      totalFieldCount: totalCollectable,
      readinessPercentage: score,
      inventoryItemCount: b._count.inventory,
      isPartner: dsaStoreIds.has(b.id),
    }
  })

  return {
    organizationId,
    stores,
    totalStores: stores.length,
    activeStores: stores.filter((s) => s.isActive).length,
  }
}
