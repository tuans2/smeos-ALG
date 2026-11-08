import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { validateBrandProfileInput } from "@/modules/profiles/domain/profile-rules"
import { getBrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"
import type { IBrandProfileRepository } from "@/modules/profiles/domain/repositories/brand-profile-repository.interface"

import { getBrandProfile, type BrandProfileDetail } from "./get-brand-profile"

export type PutBrandProfileInput = {
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
  slogan?: string | null | undefined
}

/**
 * `PUT /brand-profile` (`F2`, đặc tả 06 mục 5). Cùng ngữ nghĩa thay-toàn-bộ
 * với `putBusinessProfile`.
 */
export async function putBrandProfile(
  ctx: TenantContext,
  input: PutBrandProfileInput,
  repo: IBrandProfileRepository = getBrandProfileRepository()
): Promise<BrandProfileDetail> {
  const errors = validateBrandProfileInput(input)
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  await repo.upsert(ctx, input)

  const detail = await getBrandProfile(ctx, repo)
  if (!detail) throw new Error("upsert brand_profiles không trả lại bản ghi vừa ghi")
  return detail
}
