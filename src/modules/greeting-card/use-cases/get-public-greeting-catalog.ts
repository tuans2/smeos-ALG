import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import type { GreetingCatalogProduct } from "../domain/greeting-card-types"
import { withPaymentCodeFlag, type ShippingConfig } from "../domain/brochure-pricing"
import { collectImageAssetIds, toCatalogProduct } from "./brochure-product-mapper"
import { toPublicCatalogFilters } from "../domain/greeting-template-registry"
import type { ShopContact } from "../domain/shop-contact"
import { getShopContact } from "./get-shop-contact"
import { loadPolicyGovernance } from "@/modules/organization/use-cases/governance-matrix"
import { applyPriceVisibility, readPriceVisibility } from "../domain/price-visibility"
import type { EntryActions } from "@/modules/orders/domain/entry-actions"
import { brochureEntryActions } from "../domain/brochure-entry-actions"

export type PublicGreetingCatalogResult =
  | {
      status: "ACTIVE"
      catalog: {
        id: string
        code: string
        name: string
        description: string | null
        orgSlug: string
        filters?: Record<string, unknown> | null
      }
      products: GreetingCatalogProduct[]
      shipping: ShippingConfig
      shop: ShopContact | null
      /** Nút "Đặt hàng" / "Liên hệ" chủ cửa hàng bật cho Bộ sưu tập riêng */
      entryActions: EntryActions
    }
  | { status: "NOT_FOUND" }

type CatalogWithItems = NonNullable<Awaited<ReturnType<GreetingCardRepository["getPublicCatalogById"]>>>

/**
 * Hàm dùng chung: map catalog DB → PublicGreetingCatalogResult.
 * Dùng lại bởi cả lookup theo ID và lookup theo slug+code.
 */
export async function mapCatalogToPublicResult(
  catalog: CatalogWithItems,
  repo: GreetingCardRepository
): Promise<PublicGreetingCatalogResult> {
  // Batch resolve asset storage keys (chống N+1) — giá theo Product Master, không bịa giá
  const assetMap = await repo.getAssetsStorageMap(catalog.organization_id, collectImageAssetIds(catalog.items))
  // Mẫu tạm hết hàng không hiện cho khách
  const visibility = readPriceVisibility(catalog.organization.settings)
  const products: GreetingCatalogProduct[] = catalog.items
    .map((item) => applyPriceVisibility(toCatalogProduct(item, assetMap), visibility))
    .filter((p) => p.available !== false)

  const shop = await repo.getShopProfile(catalog.organization_id)

  return {
    status: "ACTIVE",
    shipping: withPaymentCodeFlag(shop.settings),
    shop: await getShopContact(catalog.organization_id),
    catalog: {
      id: catalog.id,
      code: catalog.code,
      name: catalog.name,
      description: catalog.description,
      orgSlug: catalog.organization.slug,
      filters: toPublicCatalogFilters(catalog.filters, catalog.organization.settings, undefined, await loadPolicyGovernance(catalog.organization_id)),
    },
    products,
    entryActions: brochureEntryActions(catalog.organization.settings),
  }
}

/**
 * Lấy Bộ Sưu Tập Thẻ Chào theo ID để hiển thị công khai (route /g/[id]).
 * Không cần auth, không tạo session — chỉ đọc dữ liệu.
 */
export async function getPublicGreetingCatalog(
  catalogId: string,
  repo = getGreetingCardRepository()
): Promise<PublicGreetingCatalogResult> {
  const catalog = await repo.getPublicCatalogById(catalogId)
  if (!catalog) return { status: "NOT_FOUND" }
  return mapCatalogToPublicResult(catalog, repo)
}
