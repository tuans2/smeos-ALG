import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { PrismaDispatchReminderRepository } from "@/modules/coordinator/infra/prisma-dispatch-reminder-repository"
import {
  getReminderPolicyConfig,
  updateReminderPolicyConfig,
} from "@/modules/coordinator/use-cases/manage-reminder-policy"
import type { DispatchReminderPolicyConfig } from "@/modules/coordinator/domain/dispatch-reminder-types"
import { reminderPolicyBody } from "@/app/api/v1/_contracts/requests-coordinator"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /api/v1/coordinator/settings/reminders` (D1)
 * Lấy cấu hình chính sách nhắc việc điều phối cấp tổ chức.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "D1" },
  handler: async ({ ctx }) => {
    const repository = new PrismaDispatchReminderRepository()
    const config = await getReminderPolicyConfig(ctx.organizationId, repository)

    return jsonResponse({ config })
  },
})

/**
 * `PUT /api/v1/coordinator/settings/reminders` (R12)
 * Cập nhật cấu hình chính sách nhắc việc điều phối cấp tổ chức.
 */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "R12" },
  handler: async ({ request, ctx }) => {
    const raw = await request.json().catch(() => null)
    const parsed = reminderPolicyBody.safeParse(raw)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const cleanData: Partial<DispatchReminderPolicyConfig> = {}
    if (parsed.data.m0MinutesAfterPaid !== undefined) {
      cleanData.m0MinutesAfterPaid = parsed.data.m0MinutesAfterPaid
    }
    if (parsed.data.m1MinutesBeforeDelivery !== undefined) {
      cleanData.m1MinutesBeforeDelivery = parsed.data.m1MinutesBeforeDelivery
    }
    if (parsed.data.m2MinutesBeforeDelivery !== undefined) {
      cleanData.m2MinutesBeforeDelivery = parsed.data.m2MinutesBeforeDelivery
    }
    if (parsed.data.m3MinutesAfterShipperAssigned !== undefined) {
      cleanData.m3MinutesAfterShipperAssigned = parsed.data.m3MinutesAfterShipperAssigned
    }
    if (parsed.data.m5MinutesAfterDelivery !== undefined) {
      cleanData.m5MinutesAfterDelivery = parsed.data.m5MinutesAfterDelivery
    }

    const repository = new PrismaDispatchReminderRepository()
    const updated = await updateReminderPolicyConfig(
      ctx.organizationId,
      cleanData,
      repository
    )

    return jsonResponse({ config: updated })
  },
})
