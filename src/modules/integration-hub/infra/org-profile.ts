/** Tầng và gói dịch vụ của tổ chức đang hoạt động — đầu vào cho luật danh mục. */

import type { TenantContext } from "@/core/tenancy"
import { AppError } from "@/core/http/errors"
import { organizationTierOf } from "@/core/governance/tier-of"
import { PLAN_FEATURES, resolvePlanFromOrg } from "@/core/entitlements/entitlement-service"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import type { GovernanceTier } from "@/core/governance/layered-resolver"

export interface OrgProfile {
  readonly tier: GovernanceTier
  readonly planFeatures: ReadonlySet<string>
}

export async function loadOrgProfile(ctx: TenantContext): Promise<OrgProfile> {
  const org = await getOrganizationRepository().current(ctx)
  if (!org) throw new AppError("NOT_FOUND", "Không tìm thấy tổ chức")
  return {
    tier: organizationTierOf(org.type),
    planFeatures: new Set(PLAN_FEATURES[resolvePlanFromOrg(org.credit_plan, org.type)] ?? []),
  }
}
