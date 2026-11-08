import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { PrismaDispatchReminderRepository } from "@/modules/coordinator/infra/prisma-dispatch-reminder-repository"
import { acknowledgeCoordinatorReminder } from "@/modules/coordinator/use-cases/acknowledge-coordinator-reminder"
import { acknowledgeReminderBody } from "@/app/api/v1/_contracts/requests-coordinator"

/**
 * `POST /api/v1/coordinator/reminders/acknowledge` (R3)
 * Điều phối viên xác nhận hoàn tất, hẹn lại hoặc bỏ qua mốc nhắc việc.
 */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R3")

  const raw = await request.json().catch(() => null)
  const parsed = acknowledgeReminderBody.safeParse(raw)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const repository = new PrismaDispatchReminderRepository()
  const result = await acknowledgeCoordinatorReminder(
    {
      organizationId: ctx.organizationId,
      orderId: parsed.data.orderId,
      milestone: parsed.data.milestone,
      action: parsed.data.action,
      actorId: ctx.userId,
      snoozeMinutes: parsed.data.snoozeMinutes,
      note: parsed.data.note,
    },
    repository
  )

  return jsonResponse(result)
})
