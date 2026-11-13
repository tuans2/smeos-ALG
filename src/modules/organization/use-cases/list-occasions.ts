import type { TenantContext } from "@/core/tenancy"
import { OccasionRepository, getOccasionRepository } from "@/modules/organization/infra/occasion-repository"

/** `GET /occasions` (nợ #104 — quản lý dịp, dùng chung F1 với hồ sơ tổ chức). */
export function listOccasions(ctx: TenantContext) {
  return getOccasionRepository().listAll(ctx)
}
