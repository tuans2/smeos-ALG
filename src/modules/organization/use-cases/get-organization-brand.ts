import type { TenantContext } from "@/core/tenancy"
import { notFound } from "@/core/http/errors"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import type { UiBrandSettings } from "@/modules/organization/domain/brand-config"

/**
 * Lấy cấu hình nhận diện thương hiệu tổ chức (`ui_brand`) — ADR-011 F1-04.
 */
export async function getOrganizationBrand(
  ctx: TenantContext,
  repository = new OrganizationRepository()
): Promise<UiBrandSettings | null> {
  const current = await repository.current(ctx)
  if (!current) throw notFound()

  const settings = (current.settings as Record<string, unknown> | null) ?? {}
  const brand = (settings["ui_brand"] as UiBrandSettings | undefined) ?? null
  return brand
}

