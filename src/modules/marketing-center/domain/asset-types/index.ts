/**
 * Toàn bộ danh mục 92 Asset của ALG (77 asset + 15 nhận diện thương hiệu).
 *
 * SSOT: `docs/kien-truc/Nâng cấp tasks/ALG_Marketing_Sales_Center/02_DANH_MUC_ASSET.md`.
 */

import type { AssetTypeDefinition, BusinessModuleKey } from "../asset-type"
import { BRAND_ASSET_TYPES } from "./brand"
import { CARE_ASSET_TYPES } from "./care"
import { CONTENT_ASSET_TYPES } from "./content"
import { PRINT_ASSET_TYPES } from "./print"
import { PROMOTION_ASSET_TYPES } from "./promotion"
import { SALES_ASSET_TYPES } from "./sales"

export * from "./brand"
export * from "./care"
export * from "./content"
export * from "./print"
export * from "./promotion"
export * from "./sales"

/** Toàn bộ 92 mã asset duy nhất */
export const ALL_ASSET_TYPES: readonly AssetTypeDefinition[] = [
  ...BRAND_ASSET_TYPES,
  ...CONTENT_ASSET_TYPES,
  ...PROMOTION_ASSET_TYPES,
  ...SALES_ASSET_TYPES,
  ...CARE_ASSET_TYPES,
  ...PRINT_ASSET_TYPES,
]

/** Tra cứu asset theo mã định danh */
export function getAssetTypeByCode(code: string): AssetTypeDefinition | undefined {
  return ALL_ASSET_TYPES.find((a) => a.code === code)
}

/** Lọc danh mục asset theo Business Module */
export function getAssetTypesByModule(moduleKey: BusinessModuleKey): readonly AssetTypeDefinition[] {
  return ALL_ASSET_TYPES.filter((a) => a.module === moduleKey)
}
