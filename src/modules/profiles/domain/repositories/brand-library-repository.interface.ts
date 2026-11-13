import type { TenantContext } from "@/core/tenancy"
import type { BrandLibraryCategory, BrandLibraryStatus } from "../brand-library"

export interface BrandLibraryVersionRow {
  version: number
  text_value: string | null
  note: string | null
  created_at: Date
  /** Khoá kho của ảnh — đã lọc đúng tổ chức sở hữu và chưa vào thùng rác */
  storage_key: string | null
}

export interface BrandLibraryItemRow {
  id: string
  title: string
  category: BrandLibraryCategory
  description: string | null
  share_with_members: boolean
  status: BrandLibraryStatus
  current_version: number
  updated_at: Date
  versions: BrandLibraryVersionRow[]
}

export interface NewVersionContent {
  assetId: string | null
  textValue: string | null
  note: string | null
}

export interface IBrandLibraryRepository {
  /** Mỗi mục kèm đúng phiên bản hiện hành */
  list(ctx: TenantContext, includeArchived: boolean): Promise<BrandLibraryItemRow[]>
  /** Mục kèm toàn bộ phiên bản (mới nhất trước); null nếu không thuộc tổ chức */
  findById(ctx: TenantContext, id: string): Promise<BrandLibraryItemRow | null>
  create(ctx: TenantContext, meta: { title: string; category: BrandLibraryCategory; description: string | null }, content: NewVersionContent): Promise<string>
  addVersion(ctx: TenantContext, id: string, content: NewVersionContent): Promise<number | null>
  update(ctx: TenantContext, id: string, patch: { title?: string; description?: string | null; share_with_members?: boolean; status?: BrandLibraryStatus }): Promise<boolean>
  /** Mime của ảnh nếu thuộc tổ chức và chưa vào thùng rác */
  assetMime(ctx: TenantContext, assetId: string): Promise<string | null>
  /** Chuỗi mà tổ chức đang là thành viên (bản ghi ACTIVE sớm nhất) */
  chainOf(organizationId: string): Promise<{ chainOrgId: string; chainName: string } | null>
  /** Mục chuỗi đã chia sẻ, đang dùng, kèm phiên bản hiện hành */
  listSharedBy(chainOrgId: string): Promise<BrandLibraryItemRow[]>
}
