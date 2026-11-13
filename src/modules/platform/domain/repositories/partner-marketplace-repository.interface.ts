import type { PartnerStoreProfile } from "../partner-marketplace-row-mapper"
import type { SearchableEntry } from "../partner-marketplace-filter"

export type { ListMarketplaceStoresFilter, ListMarketplaceStoresResult } from "../partner-marketplace-filter"

export type MarketplaceImportSource = "SHEET" | "EXCEL" | "SEED"

export interface MarketplacePhotoState {
  id: string
  driveImageIds: string[]
  photoKeys: string[]
  photoSourceIds: string[]
}

/** Port lưu hồ sơ chợ đối tác (bảng cấp nền tảng `partner_marketplace_stores`). */
export interface IPartnerMarketplaceRepository {
  /** Mọi hồ sơ kèm chuỗi tìm kiếm; `photoKeys` là khoá kho (chưa ký). */
  listAll(): Promise<(SearchableEntry & { photoKeys: string[] })[]>
  /** Upsert theo khoá khớp tên; giữ id và ảnh đã tải. */
  upsertMany(profiles: PartnerStoreProfile[], source: MarketplaceImportSource): Promise<{ added: number; updated: number; total: number }>
  /** Hồ sơ còn ảnh Drive chưa có trong kho, lâu chưa xử lý nhất trước, tối đa `limit`. */
  listPhotoPending(limit: number): Promise<{ items: MarketplacePhotoState[]; remaining: number }>
  /** `photoSourceIds`: Drive id ĐÃ có trong kho (song song `photoKeys`). Luôn cập nhật `updated_at`. */
  setPhotos(id: string, photoKeys: string[], photoSourceIds: string[]): Promise<void>
  /** Xoá một hồ sơ; không có → null. Trả tên và khoá ảnh của hồ sơ vừa xoá (để ghi nhật ký). */
  deleteById(id: string): Promise<{ shopName: string; source: string; photoKeys: string[] } | null>
  /**
   * Xoá nhiều hồ sơ trong một giao dịch: theo danh sách id, hoặc toàn bộ khi `expectedTotal`
   * khớp số hồ sơ hiện có (lệch → null, không xoá gì).
   */
  deleteMany(target: MarketplaceDeleteTarget): Promise<MarketplaceDeleteResult | null>
}

export type MarketplaceDeleteTarget = { ids: string[] } | { all: true; expectedTotal: number }

export interface MarketplaceDeleteResult {
  count: number
  /** Tên các hồ sơ đã xoá (tối đa `MAX_AUDIT_NAMES`) — để ghi nhật ký. */
  shopNames: string[]
  photoCount: number
}

/** Số tên hồ sơ tối đa ghi vào một dòng nhật ký xoá hàng loạt. */
export const MAX_AUDIT_NAMES = 50
