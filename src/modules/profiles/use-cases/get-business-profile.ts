import type { TenantContext } from "@/core/tenancy"
import { getBusinessProfileRepository } from "@/modules/profiles/infra/business-profile-repository"
import type { IBusinessProfileRepository } from "@/modules/profiles/domain/repositories/business-profile-repository.interface"

export type BusinessProfileDetail = {
  legal_name: string | null
  display_name: string
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  social_links: Record<string, unknown> | null
  tax_code: string | null
  description: string | null
  operating_hours: Record<string, unknown> | null
  /** Checklist ALG 9.3 */
  brand_message: string | null
  target_customers: string[]
}

/**
 * `GET /business-profile` (`F1`, đặc tả 06 mục 5). Trả `null` khi tổ chức
 * chưa nhập hồ sơ lần nào — chưa có bản ghi là trạng thái bình thường, không
 * phải lỗi (khác hành vi 404 của một tài nguyên có id không tồn tại).
 */
export async function getBusinessProfile(
  ctx: TenantContext,
  repo: IBusinessProfileRepository = getBusinessProfileRepository()
): Promise<BusinessProfileDetail | null> {
  const profile = await repo.current(ctx)
  if (!profile) return null
  return {
    legal_name: profile.legal_name,
    display_name: profile.display_name,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    website: profile.website,
    social_links: (profile.social_links as Record<string, unknown> | null) ?? null,
    tax_code: profile.tax_code,
    description: profile.description,
    operating_hours: (profile.operating_hours as Record<string, unknown> | null) ?? null,
    brand_message: profile.brand_message,
    target_customers: Array.isArray(profile.target_customers) ? profile.target_customers.filter((x): x is string => typeof x === "string") : [],
  }
}
