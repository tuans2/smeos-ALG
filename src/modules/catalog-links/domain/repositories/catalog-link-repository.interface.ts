/**
 * Catalog Link Repository Port (Domain Interface).
 * Pure TypeScript — No Prisma imports.
 * Belongs to Domain Layer of Catalog Links Module.
 */

import type { TenantContext } from "@/core/tenancy"

export interface CatalogLinkRecord {
  id: string
  organization_id: string
  slug: string
  name: string
  description: string | null
  filters: unknown
  is_revoked: boolean
  revoked_at: Date | null
  revoked_by: string | null
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface CreateCatalogLinkInput {
  slug: string
  name: string
  description?: string | null | undefined
  filters?: Record<string, unknown> | null | undefined
  createdBy: string
}

export interface UpdateCatalogLinkInput {
  name?: string | undefined
  description?: string | null | undefined
  filters?: Record<string, unknown> | null | undefined
}

export type PublicCatalogRawData =
  | {
      link: { name: string; [key: string]: unknown }
      revoked: true
    }
  | {
      link: CatalogLinkRecord
      revoked: false
      org: { name: string; settings?: unknown } | null
      bizProfile: {
        legal_name: string | null
        display_name: string | null
        phone: string | null
        email: string | null
        address: string | null
        website: string | null
        description: string | null
        social_links: unknown
        operating_hours: unknown
      } | null
      brandProfile: {
        primary_color: string | null
        logo_asset_id: string | null
        slogan: string | null
        brand_assets: unknown
      } | null
      productRows: Array<{
        id: string
        code: string
        name: string
        category: string | null
        shape: string | null
        container: string | null
        base_price: unknown
        attributes: unknown
        images: Array<{ asset_id: string }>
        analyses: Array<{
          asset_id: string | null
          raw: unknown
          edited: unknown
        }>
      }>
      assetRecords: Array<{ id: string; storage_key: string }>
    }

export interface ICatalogLinkRepository {
  findBySlug(slug: string): Promise<CatalogLinkRecord | null>
  findBySlugInOrg(ctx: TenantContext, slug: string): Promise<CatalogLinkRecord | null>
  create(ctx: TenantContext, input: CreateCatalogLinkInput): Promise<CatalogLinkRecord>
  list(ctx: TenantContext, options?: { includeRevoked?: boolean }): Promise<CatalogLinkRecord[]>
  update(ctx: TenantContext, slug: string, input: UpdateCatalogLinkInput): Promise<CatalogLinkRecord | null>
  revoke(ctx: TenantContext, slug: string, revokedBy: string): Promise<boolean>
  getPublicCatalogRaw(slug: string): Promise<PublicCatalogRawData | null>
}
