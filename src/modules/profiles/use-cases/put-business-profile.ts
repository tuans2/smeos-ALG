import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { validateBusinessProfileInput } from "@/modules/profiles/domain/profile-rules"
import { getBusinessProfileRepository } from "@/modules/profiles/infra/business-profile-repository"
import type { IBusinessProfileRepository } from "@/modules/profiles/domain/repositories/business-profile-repository.interface"

import { getBusinessProfile, type BusinessProfileDetail } from "./get-business-profile"

export type PutBusinessProfileInput = {
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
  /** Checklist ALG 9.3 — bỏ trống thì giữ giá trị đang lưu */
  brand_message?: string | null | undefined
  target_customers?: string[] | null | undefined
}

/**
 * `PUT /business-profile` (`F2`, đặc tả 06 mục 5). Thay toàn bộ bản ghi —
 * tạo mới nếu tổ chức chưa có, ghi đè nếu đã có. Trường vắng mặt trong yêu
 * cầu thành `null`, đúng ngữ nghĩa PUT (khác `PATCH /organizations/current`).
 */
export async function putBusinessProfile(
  ctx: TenantContext,
  input: PutBusinessProfileInput,
  repo: IBusinessProfileRepository = getBusinessProfileRepository()
): Promise<BusinessProfileDetail> {
  const errors = validateBusinessProfileInput({
    display_name: input.display_name,
    email: input.email,
  })
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  await repo.upsert(ctx, {
    ...input,
    display_name: input.display_name.trim(),
  })

  const detail = await getBusinessProfile(ctx, repo)
  if (!detail) throw new Error("upsert business_profiles không trả lại bản ghi vừa ghi")
  return detail
}
