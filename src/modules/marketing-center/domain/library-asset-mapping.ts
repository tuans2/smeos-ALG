/**
 * Ánh xạ mục trong Kho dữ liệu (LibraryItem) sang loại AssetType.
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-1 (1.1).
 * Quy ước: `assets.metadata.asset_type_code`.
 * Khi không có mã lưu sẵn, suy luận theo LibraryType và metadata ngữ cảnh.
 */

import type { LibraryType } from "@/modules/storage/domain/library"
import type { AssetTypeDefinition } from "./asset-type"
import { getAssetTypeByCode } from "./asset-types"

/**
 * Trả về mã loại asset (`code`) từ thông tin mục thư viện:
 * - Ưu tiên tuyệt đối `metadata.asset_type_code` nếu có.
 * - Nếu không có, suy luận theo 8 loại LibraryType và phân loại con.
 */
export function assetTypeOfLibraryItem(
  type: LibraryType,
  subtype?: string | null,
  metadata?: Record<string, unknown> | null,
): string | null {
  if (typeof metadata?.asset_type_code === "string" && metadata.asset_type_code.trim()) {
    return metadata.asset_type_code.trim()
  }

  switch (type) {
    case "catalog":
      return "18" // Catalog sản phẩm

    case "greeting_catalog":
      if (metadata?.catalog_kind === "GIFT_COLLECTION" || subtype === "GIFT") return "26"
      if (metadata?.catalog_kind === "EVENT_COLLECTION" || subtype === "EVENT") return "27"
      if (metadata?.catalog_kind === "SELECTION_SHEET" || subtype === "SELECTION") return "25"
      return "19" // Catalog mini

    case "landing":
      if (metadata?.page_type === "CAMPAIGN_SEASONAL") return "69"
      if (metadata?.page_type === "STORE_BRAND") return "TH13"
      return "68" // Trang sản phẩm nổi bật

    case "content":
      return "4" // Thẻ thông tin sản phẩm

    case "video":
      return "38" // Video trình chiếu ảnh

    case "original":
      return "1" // Ảnh bìa sản phẩm

    case "ai_image":
      if (subtype === "MARKETING") {
        if (metadata?.preset_type === "PROMOTION" || metadata?.is_promotion) return "9"
        if (metadata?.preset_type === "BANNER_DISCOUNT") return "10"
        if (metadata?.aspect_ratio === "16:9") return "11"
        return "8" // Poster quảng cáo
      }
      if (subtype === "SOCIAL") return "28"
      if (subtype === "RATIO") return "31"
      return "1"

    default:
      return null
  }
}

/**
 * Tìm đối tượng AssetTypeDefinition tương ứng với mục thư viện.
 */
export function resolveAssetDefinitionForLibraryItem(
  type: LibraryType,
  subtype?: string | null,
  metadata?: Record<string, unknown> | null,
): AssetTypeDefinition | null {
  const code = assetTypeOfLibraryItem(type, subtype, metadata)
  if (!code) return null
  return getAssetTypeByCode(code) ?? null
}

