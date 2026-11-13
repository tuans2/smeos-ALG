import type { GreetingCatalogProduct } from "./greeting-card-types"
import { resolveProductPriceVnd } from "./brochure-commerce-rules"
import {
  readDescription,
  readDimensions,
  readFlowerNames,
  readOccasions,
  readPrimaryColor,
  readStyle,
  readWrapStyle,
} from "@/modules/products/domain/master-index-fields"

/**
 * Giá niêm yết của một mẫu hoa trong thẻ chào — CÙNG MỘT hàm với trang khách và máy chủ
 * (`resolveProductPriceVnd`: `attributes.price` → `attributes.price_vnd` → biến thể đầu).
 * Bản cũ có hàm riêng bỏ sót `price_vnd` và trả 0 thay vì "chưa có giá", nên khung xem trước
 * nội bộ có thể hiện giá khác trang khách. Trả `null` khi chưa khai báo giá ("Liên hệ").
 */
export function resolveCatalogProductPrice(product: {
  attributes?: unknown
  variants?: ReadonlyArray<{ attributes?: unknown }> | null | undefined
}): number | null {
  return resolveProductPriceVnd(product.attributes, product.variants?.[0]?.attributes)
}

interface CatalogItemLike {
  sort_order: number
  product: {
    id: string
    code: string
    name: string
    category?: string | null
    attributes?: unknown
    variants?: ReadonlyArray<{ attributes?: unknown }> | null
    /** Lượt phân tích APPROVED mới nhất (nguồn Master Index) */
    analyses?: ReadonlyArray<{ raw?: unknown; edited?: unknown }> | null
  }
}

/**
 * Dựng thông tin mẫu hoa từ dữ liệu bộ sưu tập phía máy chủ. Giá luôn lấy từ
 * sản phẩm — không bao giờ tin giá do trình duyệt gửi lên.
 */
export function catalogItemToProduct(item: CatalogItemLike, imageUrl: string | null = null): GreetingCatalogProduct {
  const p = item.product
  const analysis = p.analyses?.[0]
  // Cùng quy tắc với Product Master Index; chỉ lấy trường được phép công khai (không giá vốn, không dữ liệu bán hàng)
  const src = { category: p.category ?? null, attributes: p.attributes, analysis: analysis?.edited ?? analysis?.raw ?? null }
  const flowers = readFlowerNames(src)
  const occasions = readOccasions(src)
  const dims = readDimensions(src)
  const attrs = (p.attributes as Record<string, unknown>) ?? {}
  const driveLink = typeof attrs.drive_link === "string" && attrs.drive_link ? attrs.drive_link : null
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    price: resolveCatalogProductPrice(p),
    imageUrl,
    driveLink,
    description: readDescription(src),
    flowersSummary: flowers.length > 0 ? flowers.join(", ") : null,
    occasion: occasions.length > 0 ? occasions.join(", ") : null,
    style: readStyle(src),
    category: p.category ?? null,
    color: readPrimaryColor(src),
    dimensions: dims ? `Cao ${dims.heightCm} cm · Rộng ${dims.widthCm} cm` : null,
    wrapStyle: readWrapStyle(src),
    sortOrder: item.sort_order,
  }
}
