/**
 * Loại của một link trong bảng `catalog_links` (PO 09/11/2026, kế hoạch Quảng bá §3.2). Landing và bộ sưu tập chung
 * cùng lưu một bảng; quy tắc phân biệt là quy tắc trang công khai `/c/[slug]` đang dùng (`get-public-catalog.ts`),
 * nên ô trên /cong-cu và trang khách mở luôn khớp nhau. Thuần — không import hạ tầng.
 */
export type CatalogLinkKind = "OFFICIAL_LANDING" | "CAMPAIGN_LANDING" | "PUBLIC_COLLECTION"

function asRecord(filters: unknown): Record<string, unknown> {
  return filters && typeof filters === "object" && !Array.isArray(filters) ? (filters as Record<string, unknown>) : {}
}

/** Link là một landing (chính thức hoặc chiến dịch): có dịp, phong cách landing hoặc gói nội dung đã sinh. */
export function isLandingFilters(filters: unknown): boolean {
  const f = asRecord(filters)
  return Boolean(f.occasion || f.archetype || f.generatedPackage)
}

/**
 * `store_official === true` → trang chính thức của cửa hàng (nhóm Thương hiệu); có dấu hiệu landing → landing
 * chiến dịch (nhóm Quảng bá); còn lại → bộ sưu tập chung. `filters` rỗng hoặc sai kiểu → bộ sưu tập chung.
 */
export function classifyCatalogLink(filters: unknown): CatalogLinkKind {
  if (asRecord(filters).store_official === true) return "OFFICIAL_LANDING"
  return isLandingFilters(filters) ? "CAMPAIGN_LANDING" : "PUBLIC_COLLECTION"
}
