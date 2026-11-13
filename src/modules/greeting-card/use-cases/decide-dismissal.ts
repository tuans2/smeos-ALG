import type { TenantContext } from "@/core/tenancy"
import { requireCapability } from "@/core/rbac/capabilities"
import { DismissalRepository, getDismissalRepository } from "../infra/dismissal-repository"
import { DISMISSAL_DECIDE_CAPABILITY } from "../domain/dismissal-policy"

/** Điều hành (R6) duyệt hoặc từ chối đề xuất bỏ hiển thị — kiểm theo mã quyền, không theo vai trò UI. */
export async function decideDismissal(
  ctx: TenantContext,
  input: { id: string; type: "ORDER" | "SESSION"; approve: boolean; note?: string },
  repo = getDismissalRepository(),
) {
  requireCapability(ctx, DISMISSAL_DECIDE_CAPABILITY)
  return repo.decide(ctx, input)
}
