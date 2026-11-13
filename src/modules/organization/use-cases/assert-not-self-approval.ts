import { unprocessable } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { selfApprovalBlocked } from "@/modules/organization/domain/self-approval-policy"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"

/**
 * Chốt chung cho mọi luồng duyệt phiếu (checklist ALG 9.12): người tạo phiếu không tự duyệt phiếu của
 * mình, trừ khi tổ chức bật công tắc `cho_phep_tu_duyet`. Ném 422 kèm lý do tiếng Việt.
 */
export async function assertNotSelfApproval(ctx: TenantContext, requesterId: string | null | undefined): Promise<void> {
  if (!requesterId || requesterId !== ctx.userId) return
  const settings = (await getCurrentOrganization(ctx))?.settings ?? null
  const blocked = selfApprovalBlocked({ actorId: ctx.userId, requesterId, settings })
  if (blocked) throw unprocessable(blocked, { reason: "SELF_APPROVAL" })
}
