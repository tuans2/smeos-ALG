/**
 * Lọc chợ đối tác theo hạng, khu vực và từ khoá theo trường. Thuần.
 * Tập dữ liệu là hồ sơ khảo sát (trần MAX_IMPORT_ROWS dòng) nên lọc trong bộ nhớ.
 */
import type { PartnerStoreMarketplaceEntity } from "./partner-marketplace.types"
import { normalizeTier } from "./partner-marketplace-row-mapper"

export interface ListMarketplaceStoresFilter {
  search?: string | undefined
  field?: string | undefined
  tier?: string | undefined
  district?: string | undefined
}

export interface ListMarketplaceStoresResult {
  stores: PartnerStoreMarketplaceEntity[]
  total: number
  tierCounts: Record<string, number>
}

/** Các trường được phép lọc riêng — chặn đường dẫn tuỳ ý từ query string. */
export const SEARCHABLE_FIELD_PATHS = [
  "identity.shopName", "identity.ownerName", "identity.legalCompliance",
  "contact.phone", "contact.address",
  "production.mainProductLine", "production.productLines", "production.floristCount", "production.flowerSupply",
  "business.monthlyRevenue", "business.targetCustomers", "business.paymentMethods",
  "business.challenges", "business.goals12m",
  "facilityAndDelivery.coolers", "facilityAndDelivery.coldStorage",
  "facilityAndDelivery.deliveryVehicles", "facilityAndDelivery.deliveryRadius",
  "audit.specialist",
] as const

export type SearchableEntry = { store: PartnerStoreMarketplaceEntity; searchText: string }

function valueAt(store: PartnerStoreMarketplaceEntity, path: string): unknown {
  let current: unknown = store
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function tierOf(store: PartnerStoreMarketplaceEntity): string {
  return normalizeTier(store.scoreAndTier.suggestedTier)
}

export function filterMarketplaceStores(
  entries: readonly SearchableEntry[],
  filter: ListMarketplaceStoresFilter = {}
): ListMarketplaceStoresResult {
  const tierCounts: Record<string, number> = { all: entries.length }
  for (const { store } of entries) tierCounts[tierOf(store)] = (tierCounts[tierOf(store)] ?? 0) + 1

  const q = filter.search?.trim().toLowerCase() ?? ""
  const district = filter.district?.trim().toLowerCase() ?? ""
  const field = (SEARCHABLE_FIELD_PATHS as readonly string[]).includes(filter.field ?? "") ? filter.field! : null

  const stores = entries
    .filter(({ store, searchText }) => {
      if (filter.tier && filter.tier !== "ALL" && tierOf(store) !== filter.tier) return false
      if (district && district !== "all" && !store.contact.address.toLowerCase().includes(district)) return false
      if (!q) return true
      if (!field) return searchText.includes(q)
      const v = valueAt(store, field)
      return Array.isArray(v) ? v.some((x) => String(x).toLowerCase().includes(q)) : String(v ?? "").toLowerCase().includes(q)
    })
    .map((e) => e.store)

  return { stores, total: stores.length, tierCounts }
}
