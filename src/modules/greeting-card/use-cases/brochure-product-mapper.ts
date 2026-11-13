import { resolveProductPriceVnd } from "../domain/brochure-commerce-rules"
import {
  readDescription,
  readDimensions,
  readFlowerNames,
  readOccasions,
  readPrimaryColor,
  readStyle,
  readWrapStyle,
} from "@/modules/products/domain/master-index-fields"
import { createProductSnapshot } from "../domain/greeting-card-rules"
import { recipeFromAttributes } from "../domain/recipe-snapshot"
import { resolvePricedVariants } from "../domain/brochure-pricing"
import type { GreetingCatalogProduct, ProductSnapshot } from "../domain/greeting-card-types"
import { parsePricing, sellableOptions, summarizePricing, variantImageAssetIds } from "@/modules/products/domain/product-pricing"
import { isProductAvailable, type InventoryRow } from "../domain/product-availability"

/** Hình dạng tối thiểu của một dòng `greeting_catalog_products` kèm sản phẩm. */
export interface CatalogItemRow {
  sort_order: number
  product: {
    id: string
    code: string
    name: string
    category: string | null
    branch_id?: string | null | undefined
    inventory?: InventoryRow[] | undefined
    attributes: unknown
    images: Array<{ asset_id: string }>
    variants: Array<{ id: string; name: string; size: string | null; multiplier: number; attributes: unknown }>
    /** Lượt phân tích APPROVED mới nhất (nguồn Master Index) */
    analyses?: Array<{ raw: unknown; edited: unknown }> | undefined
  }
}

/**
 * Dòng catalog → mẫu hiển thị cho khách. Giá luôn lấy từ Product Master ở
 * server; các trường mô tả theo quy tắc Product Master Index (chỉ trường được
 * phép công khai — không giá vốn, không dữ liệu bán hàng).
 */
export function toCatalogProduct(item: CatalogItemRow, imageUrls: Map<string, string>): GreetingCatalogProduct {
  const p = item.product
  const mainImg = p.images[0]
  const analysis = p.analyses?.[0]
  const src = { category: p.category, attributes: p.attributes, analysis: analysis?.edited ?? analysis?.raw ?? null }
  const flowers = readFlowerNames(src)
  const occasions = readOccasions(src)
  const dims = readDimensions(src)
  const attrs = (p.attributes as Record<string, unknown>) ?? {}
  const fallbackImageUrl = typeof attrs.imageUrl === "string" && attrs.imageUrl ? attrs.imageUrl : null
  const driveFileId = fallbackImageUrl ? fallbackImageUrl.match(/[?&]file_id=([a-zA-Z0-9_-]+)/)?.[1] : null
  const driveLink = typeof attrs.drive_link === "string" && attrs.drive_link
    ? attrs.drive_link
    : (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null)
  const pricing = parsePricing(p.attributes)
  const summary = summarizePricing(pricing)
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    price: pricing.mode === "FIXED" ? resolveProductPriceVnd(p.attributes, p.variants[0]?.attributes) : summary.minVnd,
    priceMode: pricing.mode,
    priceMaxVnd: summary.maxVnd,
    peakPriceVnd: pricing.peakPriceVnd,
    weekendIsPeak: pricing.weekendIsPeak,
    priceDimensions: pricing.dimensions.map((d) => ({ label: d.label, values: d.values })),
    imageUrl: (mainImg ? imageUrls.get(mainImg.asset_id) : undefined) ?? fallbackImageUrl,
    driveLink,
    description: readDescription(src),
    flowersSummary: flowers.length > 0 ? flowers.join(", ") : null,
    recipe: recipeFromAttributes(p.attributes),
    occasion: occasions.length > 0 ? occasions.join(", ") : null,
    style: readStyle(src),
    craftStyle: typeof attrs.craftStyle === "string" && attrs.craftStyle ? attrs.craftStyle : null,
    category: p.category,
    color: readPrimaryColor(src),
    dimensions: dims ? `Cao ${dims.heightCm} cm · Rộng ${dims.widthCm} cm` : null,
    wrapStyle: readWrapStyle(src),
    sortOrder: item.sort_order,
    // Giá theo phiên bản khai trong thẻ sản phẩm thay cho bảng size cũ
    variants: pricing.mode === "RANGE"
      ? sellableOptions(pricing).map(({ imageAssetId, ...o }) => ({ ...o, imageUrl: imageAssetId ? imageUrls.get(imageAssetId) ?? null : null }))
      : pricing.mode === "CONTACT" ? [] : resolvePricedVariants(p.attributes, p.variants),
    available: isProductAvailable(p),
  }
}

export function collectImageAssetIds(items: CatalogItemRow[]): string[] {
  return items.flatMap((item) => [...item.product.images.map((img) => img.asset_id), ...variantImageAssetIds(item.product.attributes)])
}

/** Đóng băng mẫu đã chọn. Mẫu chưa niêm yết giá ghi giá 0 = "Liên hệ" (cửa hàng báo giá sau). */
/** Bản gửi cho trang khách: bỏ công thức nội bộ (chỉ dùng chép vào ảnh chụp mẫu của đơn). */
export function forCustomer({ recipe: _recipe, ...product }: GreetingCatalogProduct): GreetingCatalogProduct {
  return product
}

export function snapshotOf(product: GreetingCatalogProduct, now = new Date()): ProductSnapshot {
  return createProductSnapshot({ ...product, price: product.price ?? 0 }, now.toISOString())
}
