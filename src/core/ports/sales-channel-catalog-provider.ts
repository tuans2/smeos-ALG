/**
 * Cổng đồng bộ danh mục sản phẩm ra kênh bán ngoài (công cụ 53 giai đoạn 5, PO 30/10/2026).
 * Khác `PublisherProvider` (đăng bài mạng xã hội qua SocialFlow): cổng này đẩy TIN ĐĂNG SẢN PHẨM
 * (tên, giá, ảnh, tồn) vào danh mục của kênh. Adapter thật đặt ở `src/modules/products/adapters/`;
 * credential lấy theo tổ chức. Chưa có adapter thật — mọi kênh trả `NOT_CONFIGURED`.
 */
export type SalesChannelId = "meta_catalog" | "google_merchant" | "tiktok_shop" | "shopee" | "zalo_oa"

export interface ChannelListing {
  readonly productId: string
  readonly sku: string
  readonly title: string
  readonly description: string
  readonly priceVnd: number
  readonly imageUrls: readonly string[]
  readonly availability: "in_stock" | "out_of_stock"
  readonly barcode: string | null
  readonly weightGrams: number | null
  readonly tags: readonly string[]
}

export type ListingSyncStatus = "SYNCED" | "REJECTED" | "NOT_CONFIGURED"

export interface ListingSyncResult {
  readonly productId: string
  readonly status: ListingSyncStatus
  readonly externalId?: string
  readonly reason?: string
}

export interface SalesChannelCatalogProvider {
  readonly channel: SalesChannelId
  /** Đẩy tối đa `MAX_LISTINGS_PER_PUSH` tin một lần — người gọi tự chia lô. */
  upsertListings(organizationId: string, listings: readonly ChannelListing[]): Promise<ListingSyncResult[]>
  removeListings(organizationId: string, productIds: readonly string[]): Promise<ListingSyncResult[]>
}

export const MAX_LISTINGS_PER_PUSH = 100
