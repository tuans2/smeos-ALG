/**
 * Admin nền tảng duyệt hoặc từ chối yêu cầu nâng hạn mức chat công khai của tiệm (N2).
 * Duyệt: ghi đúng mức tiệm đã xin (trong trần cứng) vào các kênh trang công khai,
 * rồi xoá yêu cầu chờ duyệt. Từ chối: chỉ xoá yêu cầu.
 */
import { notFound, validationFailed } from "@/core/http/errors"
import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { writeApprovedPublicChatLimits } from "@/modules/chat-assistant/infra/public-chat-limit-repository"
import {
  PENDING_PUBLIC_CHAT_LIMITS_KEY,
  isAllowedLimitTier,
  readPendingLimitRequest,
} from "@/modules/chat-assistant/domain/public-chat-limit-request"

export interface DecidePublicChatLimitsDeps {
  orgRepo: Pick<ReturnType<typeof getOrganizationRepository>, "findById" | "updateTypeAndSettings">
  writeLimits: typeof writeApprovedPublicChatLimits
  audit: typeof recordAuditLog
  now: () => Date
}

const defaultDeps = (): DecidePublicChatLimitsDeps => ({
  orgRepo: getOrganizationRepository(),
  writeLimits: writeApprovedPublicChatLimits,
  audit: recordAuditLog,
  now: () => new Date(),
})

export async function decidePublicChatLimits(
  pctx: PlatformContext,
  input: { organizationId: string; approve: boolean },
  deps: DecidePublicChatLimitsDeps = defaultDeps(),
): Promise<{ success: true; action: "approved" | "rejected" }> {
  requirePlatformCapability(pctx, "N2")
  const org = await deps.orgRepo.findById(input.organizationId)
  if (!org) throw notFound()
  const settings = org.settings && typeof org.settings === "object" ? (org.settings as Record<string, unknown>) : {}
  const pending = readPendingLimitRequest(settings)
  if (!pending) throw validationFailed({ request: "Không có yêu cầu nâng hạn mức đang chờ duyệt" })

  if (input.approve) {
    // Chỉ duyệt đúng các mức chọn sẵn — dữ liệu sửa tay trong settings không vượt được
    if (!isAllowedLimitTier(pending.per_visitor, pending.per_ip)) {
      throw validationFailed({ request: "Mức đề nghị không hợp lệ" })
    }
    await deps.writeLimits(org.id, {
      perVisitor: pending.per_visitor,
      perIp: pending.per_ip,
      approvedAt: deps.now().toISOString(),
    })
  }

  const { [PENDING_PUBLIC_CHAT_LIMITS_KEY]: _removed, ...rest } = settings
  await deps.orgRepo.updateTypeAndSettings(org.id, org.type, rest)

  await deps.audit(
    { organizationId: org.id, workspaceId: "", userId: pctx.userId, branchId: null, capabilities: new Set(["N2"]) },
    {
      action: input.approve ? "platform.public_chat_limits_approved" : "platform.public_chat_limits_rejected",
      entityType: "organizations",
      entityId: org.id,
      before: { pending },
      after: input.approve ? { per_visitor: pending.per_visitor, per_ip: pending.per_ip } : null,
    },
  )
  return { success: true, action: input.approve ? "approved" : "rejected" }
}
