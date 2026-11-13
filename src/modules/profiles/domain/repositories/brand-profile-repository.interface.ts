/**
 * IBrandProfileRepository — Port Interface cho Brand Profiles.
 *
 * Đặt tại domain/repositories/ theo chuẩn Clean Architecture (Zero ORM).
 */

import type { TenantContext } from "@/core/tenancy"
import type { brand_profiles } from "@/modules/profiles/infra/entities"

export interface UpsertBrandProfileInput {
  primary_color?: string | null | undefined
  secondary_color?: string | null | undefined
  accent_color?: string | null | undefined
  background_color?: string | null | undefined
  text_color?: string | null | undefined
  font_heading?: string | null | undefined
  font_body?: string | null | undefined
  logo_asset_id?: string | null | undefined
  tone_of_voice?: string | null | undefined
  hashtags?: unknown
  cta_templates?: unknown
  default_offers?: unknown
  forbidden_styles?: unknown
  brand_assets?: unknown
  /** Bỏ trống (undefined) thì giữ giá trị đang lưu — form cũ không gửi trường này */
  slogan?: string | null | undefined
}

export interface IBrandProfileRepository {
  current(ctx: TenantContext): Promise<brand_profiles | null>
  upsert(ctx: TenantContext, input: UpsertBrandProfileInput): Promise<brand_profiles>
}
