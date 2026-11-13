/**
 * IBusinessProfileRepository — Port Interface cho Business Profiles.
 *
 * Đặt tại domain/repositories/ theo chuẩn Clean Architecture (Zero ORM).
 */

import type { TenantContext } from "@/core/tenancy"
import type { business_profiles } from "@/modules/profiles/infra/entities"

export interface UpsertBusinessProfileInput {
  legal_name?: string | null | undefined
  display_name: string
  phone?: string | null | undefined
  email?: string | null | undefined
  address?: string | null | undefined
  website?: string | null | undefined
  social_links?: Record<string, unknown> | null | undefined
  tax_code?: string | null | undefined
  description?: string | null | undefined
  operating_hours?: Record<string, unknown> | null | undefined
  /** Checklist ALG 9.3 — bỏ trống (undefined) thì giữ giá trị đang lưu */
  brand_message?: string | null | undefined
  target_customers?: string[] | null | undefined
}

export interface IBusinessProfileRepository {
  current(ctx: TenantContext): Promise<business_profiles | null>
  upsert(ctx: TenantContext, input: UpsertBusinessProfileInput): Promise<business_profiles>
}
