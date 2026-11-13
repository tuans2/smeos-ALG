/**
 * Use-Case: Get Coordinator Reminders.
 * Lấy danh sách các nhắc nhở active cho Điều phối viên theo thời gian thực.
 */

import type { IDispatchReminderRepository } from "../domain/dispatch-reminder-repository-port"
import {
  calculateMilestoneSchedule,
  resolveEffectiveReminderConfig,
} from "../domain/dispatch-reminder-resolver"
import { evaluateOrderReminders } from "../domain/dispatch-reminder-evaluator"
import type { ActiveReminderItem } from "../domain/dispatch-reminder-types"

export interface GetCoordinatorRemindersResult {
  reminders: ActiveReminderItem[]
  totalActive: number
  totalOverdue: number
  totalCritical: number
}

export async function getCoordinatorReminders(
  organizationId: string,
  repository: IDispatchReminderRepository,
  currentTime = new Date()
): Promise<GetCoordinatorRemindersResult> {
  const [orders, policy] = await Promise.all([
    repository.getActiveOrdersForReminders(organizationId),
    repository.getPolicyConfig(organizationId),
  ])

  const allReminders: ActiveReminderItem[] = []

  for (const order of orders) {
    const effectiveConfig = resolveEffectiveReminderConfig(order.templateOverrides, policy)
    const schedule = calculateMilestoneSchedule(order, effectiveConfig)
    const reminders = evaluateOrderReminders(order, schedule, currentTime)
    allReminders.push(...reminders)
  }

  // Sắp xếp ưu tiên: CRITICAL trước, sau đó quá hạn nhiều nhất trước
  allReminders.sort((a, b) => {
    if (a.urgency === "CRITICAL" && b.urgency !== "CRITICAL") return -1
    if (b.urgency === "CRITICAL" && a.urgency !== "CRITICAL") return 1
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return b.overdueMinutes - a.overdueMinutes
  })

  const totalOverdue = allReminders.filter((r) => r.isOverdue).length
  const totalCritical = allReminders.filter((r) => r.urgency === "CRITICAL").length

  return {
    reminders: allReminders,
    totalActive: allReminders.length,
    totalOverdue,
    totalCritical,
  }
}
