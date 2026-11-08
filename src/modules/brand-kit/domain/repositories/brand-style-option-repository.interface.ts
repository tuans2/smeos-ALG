/**
 * Cổng lưu phương án Thương hiệu (`brand_style_options`). Mọi phương thức nhận `TenantContext` —
 * tổ chức chỉ đến từ ngữ cảnh phiên. Zero ORM.
 */
import type { TenantContext } from "@/core/tenancy"
import type { BrandOptionKind } from "../option-rules"

export interface BrandStyleOptionRow {
  readonly id: string
  readonly kind: BrandOptionKind
  readonly style_key: string
  readonly batch: number
  readonly content: unknown
  readonly profile_fingerprint: string
  readonly job_id: string | null
  readonly selected_at: Date | null
  readonly created_at: Date
}

export interface NewBrandStyleOption {
  readonly kind: BrandOptionKind
  readonly style_key: string
  readonly batch: number
  readonly content: unknown
  readonly profile_fingerprint: string
  readonly job_id: string | null
}

export interface IBrandStyleOptionRepository {
  /** Phương án của một loại: lượt mới nhất trước, trong lượt theo thứ tự tạo. */
  list(ctx: TenantContext, kind: BrandOptionKind): Promise<BrandStyleOptionRow[]>
  findById(ctx: TenantContext, id: string): Promise<BrandStyleOptionRow | null>
  createMany(ctx: TenantContext, rows: readonly NewBrandStyleOption[]): Promise<BrandStyleOptionRow[]>
  /** Bỏ chọn mọi phương án cùng loại rồi chọn `id` — trong một giao dịch. false = không thuộc tổ chức. */
  select(ctx: TenantContext, kind: BrandOptionKind, id: string, now: Date): Promise<boolean>
  updateContent(ctx: TenantContext, id: string, content: unknown): Promise<void>
}
