/**
 * Use-Case: Acknowledge Coordinator Reminder.
 * Điều phối viên xác nhận đã xử lý, hẹn lại hoặc bỏ qua một mốc nhắc việc.
 */

import type { IDispatchReminderRepository } from "../domain/dispatch-reminder-repository-port"
import type { CoordinatorMilestoneCode } from "../domain/dispatch-reminder-types"

export interface AcknowledgeReminderCommand {
  organizationId: string
  orderId: string
  milestone: CoordinatorMilestoneCode
  action: "ACKNOWLEDGED" | "SNOOZED" | "DISMISSED"
  actorId?: string | undefined
  snoozeMinutes?: number | undefined
  note?: string | undefined
}

const VALID_MILESTONES = new Set<CoordinatorMilestoneCode>([
  "M0",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
])

export async function acknowledgeCoordinatorReminder(
  command: AcknowledgeReminderCommand,
  repository: IDispatchReminderRepository
): Promise<{ success: boolean; message: string }> {
  if (!VALID_MILESTONES.has(command.milestone)) {
    throw new Error(`Mốc nhắc việc không hợp lệ: ${command.milestone}`)
  }

  await repository.acknowledgeMilestone({
    organizationId: command.organizationId,
    orderId: command.orderId,
    milestone: command.milestone,
    action: command.action,
    actorId: command.actorId,
    snoozeMinutes: command.snoozeMinutes,
    note: command.note,
  })

  return {
    success: true,
    message:
      command.action === "ACKNOWLEDGED"
        ? `Đã xác nhận hoàn tất mốc ${command.milestone}`
        : command.action === "SNOOZED"
        ? `Đã hẹn lại mốc ${command.milestone} sau ${command.snoozeMinutes ?? 10} phút`
        : `Đã bỏ qua mốc ${command.milestone}`,
  }
}
