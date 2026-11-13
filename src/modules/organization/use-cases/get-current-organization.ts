import type { TenantContext } from "@/core/tenancy"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"

export type OrganizationDetail = {
  id: string
  name: string
  slug: string
  type: string
  credit_balance: number
  settings: Record<string, unknown> | null
}

/** `GET /organizations/current` (`F1`, đặc tả 06 mục 3). */
export async function getCurrentOrganization(ctx: TenantContext): Promise<OrganizationDetail | null> {
  const organization = await getOrganizationRepository().current(ctx)
  if (!organization) return null
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    type: organization.type,
    credit_balance: organization.credit_balance,
    settings: (organization.settings as Record<string, unknown> | null) ?? null,
  }
}
