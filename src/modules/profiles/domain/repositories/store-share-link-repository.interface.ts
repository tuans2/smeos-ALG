import type { TenantContext } from "@/core/tenancy"

export interface StoreShareLinkRecord {
  id: string
  slug: string
  is_revoked: boolean
  view_count: number
  created_at: Date
}

/** Dữ liệu thô cho trang công khai — chỉ trường được phép hiện cho khách. */
export interface PublicStoreRaw {
  revoked: boolean
  organizationId: string
  orgName: string
  business: {
    display_name: string
    phone: string | null
    email: string | null
    address: string | null
    website: string | null
    description: string | null
    social_links: unknown
    operating_hours: unknown
  } | null
  primaryColor: string | null
  logo: { kind: "URL"; url: string } | { kind: "ASSET"; storageKey: string } | null
}

export interface IStoreShareLinkRepository {
  findActive(ctx: TenantContext): Promise<StoreShareLinkRecord | null>
  slugExists(slug: string): Promise<boolean>
  /** Tạo link mới nếu tổ chức chưa có link đang hoạt động; có rồi thì trả link đó. */
  createIfNoActive(ctx: TenantContext, slug: string): Promise<StoreShareLinkRecord>
  revokeActive(ctx: TenantContext): Promise<boolean>
  findPublic(slug: string): Promise<PublicStoreRaw | null>
  incrementViews(slug: string): Promise<void>
}
