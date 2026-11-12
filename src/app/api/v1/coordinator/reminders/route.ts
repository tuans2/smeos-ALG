import { jsonResponse } from "@/core/http/response"
import { PrismaDispatchReminderRepository } from "@/modules/coordinator/infra/prisma-dispatch-reminder-repository"
import { getCoordinatorReminders } from "@/modules/coordinator/use-cases/get-coordinator-reminders"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /api/v1/coordinator/reminders` (R1)
 * Lấy danh sách các thông báo nhắc việc đang active (M0..M5) của các đơn hàng.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx }) => {
    const repository = new PrismaDispatchReminderRepository()
    const result = await getCoordinatorReminders(ctx.organizationId, repository)

    return jsonResponse(result)
  },
})
