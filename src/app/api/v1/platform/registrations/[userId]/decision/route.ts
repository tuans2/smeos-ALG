/**
 * POST /api/v1/platform/registrations/:userId/decision — duyệt hoặc từ chối một tài khoản tự đăng
 * ký (`N13`, PO 22/10/2026). Duyệt tài khoản dùng thử trả `temporaryPassword` đúng một lần.
 */

import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { AccountApprovalRepository } from "@/modules/platform/infra/account-approval-repository"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { registrationDecisionBody } from "@/app/api/v1/platform/_contracts/requests"

export const POST = handle(async (request, { params }: { params: Promise<{ userId: string }> }) => {
  const pctx = await requirePlatformContext(request)
  requirePlatformCapability(pctx, "N13")
  const parsed = registrationDecisionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { userId } = await params

  const result = await new AccountApprovalRepository().decide(userId, parsed.data.decision, pctx.userId)
  // Không bao giờ ghi mật khẩu tạm vào nhật ký
  await recordPlatformAuditLog(pctx, {
    action: parsed.data.decision === "APPROVE" ? "platform.registration.approve" : "platform.registration.reject",
    entityType: "USER",
    entityId: userId,
    before: { approval_status: "PENDING" },
    after: { approval_status: result.status, temporary_password_issued: Boolean(result.temporaryPassword) },
  })
  return jsonResponse({ data: result })
})

export const dynamic = "force-dynamic" as const
