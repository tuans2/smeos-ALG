import type { TenantContext } from "@/core/tenancy"
import { requireCapability } from "@/core/rbac/capabilities"
import { DismissalRestoreRepository, getDismissalRestoreRepository } from "../infra/dismissal-restore-repository"
import { DISMISSAL_DECIDE_CAPABILITY } from "../domain/dismissal-policy"

/** Khôi phục đơn/link đã bỏ hiển thị — cùng quyền với duyệt bỏ hiển thị (R6). */
export async function restoreDismissal(
  ctx: TenantContext,
  input: { id: string; type: "ORDER" | "SESSION"; reason?: string },
  repo = getDismissalRestoreRepository(),
) {
  requireCapability(ctx, DISMISSAL_DECIDE_CAPABILITY)
  return repo.restore(ctx, input)
}
