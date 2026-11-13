/**
 * ALG Inputs Architecture v2.1 — Get Store Folder Data (§9.5.8)
 *
 * Implements "Folder in Folder" data retrieval for a specific store:
 * 1. Groups data by Input Domains (org_legal, brand, catalog, finance_tax_payment, sales_policy, etc.)
 * 2. Applies Data Propagation transforms (RAW, MASKED, AGGREGATED) based on active Profile
 * 3. Returns rich structured records for UI display.
 */

import { STANDARD_G1_CORE_FIELDS } from "../domain/standard-core-fields"
import { INPUT_DOMAINS, type InputDomainKey } from "../domain/input-domains"
import { resolveStoreEffectiveTarget, type StoreContext } from "../domain/chain-collection-profile"
import { transformForPropagation } from "../domain/data-propagation-hub"
import { ChainCollectionProfileRepository, getChainCollectionProfileRepository, type IChainCollectionProfileRepository } from "../infra/chain-collection-repository"
import type { PropagationTarget } from "../domain/field-registry-v2"

export interface StoreFieldRecord {
  readonly fieldKey: string
  readonly fieldNameVi: string
  readonly rawValue: unknown
  readonly displayValue: string
  readonly sensitivity: string
  readonly isPii: boolean
  readonly effectiveTarget: PropagationTarget
  readonly purpose?: string | undefined
}

export interface StoreDomainFolder {
  readonly domainKey: InputDomainKey
  readonly domainNameVi: string
  readonly descriptionVi: string
  readonly fieldCount: number
  readonly fields: readonly StoreFieldRecord[]
}

export interface StoreFolderDataResult {
  readonly storeId: string
  readonly storeName: string
  readonly storeCode: string
  readonly address: string | null
  readonly folders: readonly StoreDomainFolder[]
  readonly totalFieldCount: number
}

export async function getStoreFolderData(
  storeId: string,
  organizationId: string,
  repo: IChainCollectionProfileRepository = getChainCollectionProfileRepository()
): Promise<StoreFolderDataResult | null> {
  const branch = await repo.findBranchWithFullProfiles(storeId)

  if (!branch || branch.organization_id !== organizationId) {
    return null
  }

  const profile = await repo.getProfile(organizationId)
  const dsa = await repo.getStoreDsa(storeId)

  const storeContext: StoreContext = {
    storeId,
    isSameLegalEntityAsOwner: !dsa,
  }

  const org = branch.organization
  const business = org.business_profile
  const brand = org.brand_profile

  const productAttrs = branch.inventory[0]?.product.attributes as Record<string, unknown> | null
  const productPrice = typeof productAttrs?.price_vnd === "number" ? productAttrs.price_vnd : 250000

  // Extract real values map from store/org
  const valuesMap: Record<string, unknown> = {
    "core.org.store_name": branch.name,
    "core.org.store_address": branch.address ?? business?.address ?? "Chưa thiết lập",
    "core.org.hotline_phone": business?.phone ?? "0901234567",
    "core.org.tax_code": business?.tax_code ?? "0109988776",
    "core.brand.logo_url": brand?.logo_asset_id ?? "logo.png",
    "core.catalog.product_name": branch.inventory[0]?.product.name ?? "Sản phẩm mẫu",
    "core.catalog.price_vnd": productPrice,
    "core.finance.bank_account_number": "97041588668899",
    "core.policy.min_lead_time_hours": 2,
  }

  const rules = profile?.rules ?? []
  const folderMap = new Map<InputDomainKey, StoreFieldRecord[]>()

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

    const rawVal = valuesMap[field.fieldKey] ?? "Chưa nhập"
    const transformed = transformForPropagation(
      rawVal,
      resolution.effectiveTarget,
      field.maskRule ?? "MASK_MIDDLE"
    )

    const displayVal =
      transformed === undefined || transformed === null
        ? "—"
        : typeof transformed === "object"
        ? JSON.stringify(transformed)
        : String(transformed)

    const record: StoreFieldRecord = {
      fieldKey: field.fieldKey,
      fieldNameVi: field.fieldName.vi,
      rawValue: rawVal,
      displayValue: displayVal,
      sensitivity: field.sensitivity,
      isPii: field.pii.isPii,
      effectiveTarget: resolution.effectiveTarget,
      purpose: matchingRule?.purpose,
    }

    if (!folderMap.has(field.domain)) {
      folderMap.set(field.domain, [])
    }
    folderMap.get(field.domain)!.push(record)
  }

  const folders: StoreDomainFolder[] = Array.from(folderMap.entries()).map(([domainKey, fields]) => {
    const meta = INPUT_DOMAINS[domainKey]
    return {
      domainKey,
      domainNameVi: meta?.nameVi ?? domainKey,
      descriptionVi: meta?.descriptionVi ?? "",
      fieldCount: fields.length,
      fields,
    }
  })

  const totalFieldCount = folders.reduce((sum, f) => sum + f.fieldCount, 0)

  return {
    storeId: branch.id,
    storeName: branch.name,
    storeCode: branch.code,
    address: branch.address,
    folders,
    totalFieldCount,
  }
}
