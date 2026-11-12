/**
 * ALG Inputs Architecture v2.1 — Register Partner Store with DSA (§4.3 & §9.5.3)
 *
 * Implements onboarding of a franchise/partner store under a separate legal entity,
 * bound by a Data Sharing Agreement (DSA).
 */

import { ChainCollectionProfileRepository, getChainCollectionProfileRepository, type IChainCollectionProfileRepository } from "../infra/chain-collection-repository"
import type { DataSharingAgreement } from "../domain/chain-collection-profile"
import type { PropagationTarget } from "../domain/field-registry-v2"

export interface RegisterPartnerStoreInput {
  readonly organizationId: string
  readonly name: string
  readonly code: string
  readonly address?: string | null | undefined
  readonly legalEntityId: string
  readonly fieldCeilings: Readonly<Record<string, PropagationTarget>>
  readonly validUntil?: string | undefined
}

export interface RegisterPartnerStoreResult {
  readonly storeId: string
  readonly name: string
  readonly code: string
  readonly isPartner: boolean
  readonly dsa: DataSharingAgreement
}

export async function registerPartnerStore(
  input: RegisterPartnerStoreInput,
  repo: IChainCollectionProfileRepository = getChainCollectionProfileRepository()
): Promise<RegisterPartnerStoreResult> {
  const { organizationId, name, code, address, legalEntityId, fieldCeilings, validUntil } = input

  // Setup Data Sharing Agreement draft
  const dsa: DataSharingAgreement = {
    storeId: "",
    legalEntityId,
    fieldCeilings,
    validUntil: validUntil ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ACTIVE",
  }

  // Create branch entry and persist DSA in repo
  const branch = await repo.createPartnerBranch({
    organizationId,
    name,
    code,
    address: address ?? null,
    dsa,
  })

  return {
    storeId: branch.id,
    name: branch.name,
    code: branch.code,
    isPartner: true,
    dsa: {
      ...dsa,
      storeId: branch.id,
    },
  }
}
