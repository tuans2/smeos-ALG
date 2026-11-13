/**
 * @/lib/product-filter — SSOT cho hệ thống Lọc & Tìm kiếm Sản phẩm ALG
 *
 * Import từ đây thay vì import trực tiếp từ file con.
 *
 * @example
 * import { filterProducts, rankProducts, matchCategory } from "@/lib/product-filter"
 * import type { ProductFilterCriteria, FilterableProduct } from "@/lib/product-filter"
 */

// Types
export type {
  PriceRange,
  ProductFilterCriteria,
  FilterableProduct,
  ScoredProduct,
} from "./product-filter-types"

// Maps & canonical helpers
export {
  CATEGORY_CANONICAL,
  categoryCanonical,
  getCategoryVariants,
  OCCASION_SLUG_MAP,
  OCCASION_NAME_KEYWORDS,
  FLOWER_NAME_KEYWORDS,
  COLOR_SLUG_MAP,
  COLOR_NAME_KEYWORDS,
} from "./product-filter-maps"

// Engine functions
export {
  matchPriceRange,
  matchCategory,
  matchOccasion,
  matchFlowerType,
  matchColorTone,
  matchSearch,
  filterProducts,
  scoreProduct,
  rankProducts,
} from "./product-filter-engine"
