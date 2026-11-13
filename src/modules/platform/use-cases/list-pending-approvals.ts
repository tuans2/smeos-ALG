import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import {
  listPendingApprovals,
  type PendingApprovalItem,
} from "@/modules/platform/infra/platform-query"

/** `GET /platform/pending-approvals` — tất cả yêu cầu chờ duyệt toàn hệ thống. */
export async function getPendingApprovals(
  pctx: PlatformContext
): Promise<PendingApprovalItem[]> {
  requirePlatformCapability(pctx, "N1")
  return listPendingApprovals(pctx)
}
