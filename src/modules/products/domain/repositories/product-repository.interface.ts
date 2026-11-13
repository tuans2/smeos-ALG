/**
 * Product Repository Port (Domain Interface).
 * Pure TypeScript — No Prisma or database imports.
 * Belongs to Domain Layer of M03 / Products (Store OS).
 */

import type { TenantContext } from "@/core/tenancy"
import type { ProductCommerceInput } from "../product-commerce"

export interface ProductEntity {
  id: string
  organization_id: string
  branch_id: string | null
  code: string
  name: string
  category: string | null
  shape: string | null
  facing: string | null
  container: string | null
  status: string
  // Use unknown to stay compatible with Prisma's JsonValue
  attributes: unknown
  availability_config: unknown
  barcode?: string | null
  cost_price_vnd?: number | null
  vat_percent?: number | null
  weight_grams?: number | null
  tags?: string[]
  created_at: Date
  updated_at: Date
}

export interface ProductPreviewEntity extends ProductEntity {
  masterImageUrl?: string | undefined
  price_vnd: number | null
  driveLink?: string | undefined
}

export interface CreateProductInput {
  code: string
  name: string
  branchId?: string | null | undefined
  category?: string | null | undefined
  shape?: string | null | undefined
  facing?: string | null | undefined
  container?: string | null | undefined
  status?: string | undefined
  attributes?: Record<string, unknown> | null | undefined
  imageAssetId?: string | null | undefined
  commerce?: ProductCommerceInput | undefined
}

export interface UpdateProductInput {
  code?: string | undefined
  name?: string | undefined
  branchId?: string | null | undefined
  category?: string | null | undefined
  shape?: string | null | undefined
  facing?: string | null | undefined
  container?: string | null | undefined
  status?: string | undefined
  attributes?: Record<string, unknown> | null | undefined
  imageAssetId?: string | null | undefined
  availabilityConfig?: unknown | undefined
  commerce?: ProductCommerceInput | undefined
}

export interface UpdateProductIdentityInput {
  category: string | null
  shape: string | null
  facing: string | null
  container: string | null
  attributes: Record<string, unknown>
}

export interface ListProductsFilters {
  branchId?: string | null | undefined
  status?: string | undefined
  category?: string | undefined
  occasionCode?: string | undefined
  color?: string | undefined
  collection?: string | undefined
  priceMin?: number | undefined
  priceMax?: number | undefined
  search?: string | undefined
  /** Chỉ các sản phẩm này (tối đa 100). */
  ids?: readonly string[] | undefined
}

export interface ListProductsPage {
  limit: number
  cursor?: string | null | undefined
}

export interface IProductRepository {
  findById(ctx: TenantContext, id: string): Promise<ProductEntity | null>
  findByCode(ctx: TenantContext, code: string): Promise<ProductEntity | null>
  listExistingCodes(ctx: TenantContext, codes: string[]): Promise<Set<string>>
  list(ctx: TenantContext, filters: ListProductsFilters, page: ListProductsPage): Promise<ProductEntity[]>
  listWithPreview(ctx: TenantContext, filters: ListProductsFilters, page: ListProductsPage): Promise<ProductPreviewEntity[]>
  create(ctx: TenantContext, input: CreateProductInput): Promise<ProductEntity>
  update(ctx: TenantContext, id: string, input: UpdateProductInput): Promise<ProductEntity | null>
  updateIdentity(ctx: TenantContext, id: string, input: UpdateProductIdentityInput): Promise<ProductEntity | null>
  linkMainImage?(ctx: TenantContext, productId: string, assetId: string): Promise<void>
}
