import type { ChannelListing, SalesChannelId } from "@/core/ports/sales-channel-catalog-provider"

/** Kênh bán dự kiến hỗ trợ — thứ tự là thứ tự đề xuất triển khai (xem đặc tả quản trị danh mục §8c). */
export const SALES_CHANNELS: ReadonlyArray<{ id: SalesChannelId; label: string; minImages: number; requiresBarcode: boolean }> = [
  { id: "meta_catalog", label: "Facebook & Instagram Shop", minImages: 1, requiresBarcode: false },
  { id: "google_merchant", label: "Google Mua sắm", minImages: 1, requiresBarcode: false },
  { id: "tiktok_shop", label: "TikTok Shop", minImages: 1, requiresBarcode: false },
  { id: "shopee", label: "Shopee", minImages: 1, requiresBarcode: false },
  { id: "zalo_oa", label: "Cửa hàng Zalo OA", minImages: 1, requiresBarcode: false },
]

export interface ListingSource {
  id: string
  code: string
  name: string
  status: string
  price_vnd: number | null
  imageUrls: string[]
  description?: string | null | undefined
  inStock?: boolean | undefined
  commerce: { barcode: string | null; weight_grams: number | null; tags: string[] }
}

/** Lý do chưa đăng được — tiếng Việt để hiện thẳng cho người dùng. */
export type ListingIssue = "Chưa mở bán" | "Chưa có giá" | "Chưa có ảnh" | "Chưa có mã vạch"

/**
 * Chuyển sản phẩm thành tin đăng chuẩn cho một kênh. Thiếu dữ liệu bắt buộc → trả danh sách lý do,
 * không đẩy tin lỗi lên kênh (kênh sẽ từ chối và có thể khoá cửa hàng nếu lỗi lặp lại).
 */
export function toChannelListing(
  p: ListingSource,
  channel: SalesChannelId | string
): { ok: true; listing: ChannelListing } | { ok: false; issues: ListingIssue[] } {
  const rule = SALES_CHANNELS.find((c) => c.id === channel)
  const issues: ListingIssue[] = []
  if (p.status !== "ACTIVE") issues.push("Chưa mở bán")
  if (p.price_vnd === null || p.price_vnd <= 0) issues.push("Chưa có giá")
  if (p.imageUrls.length < (rule?.minImages ?? 1)) issues.push("Chưa có ảnh")
  if (rule?.requiresBarcode && !p.commerce.barcode) issues.push("Chưa có mã vạch")
  if (issues.length > 0) return { ok: false, issues }
  return {
    ok: true,
    listing: {
      productId: p.id,
      sku: p.code,
      title: p.name.slice(0, 150),
      description: (p.description ?? p.name).slice(0, 5000),
      priceVnd: p.price_vnd as number,
      imageUrls: p.imageUrls.slice(0, 10),
      availability: p.inStock === false ? "out_of_stock" : "in_stock",
      barcode: p.commerce.barcode,
      weightGrams: p.commerce.weight_grams,
      tags: p.commerce.tags,
    },
  }
}
