/**
 * Dispatch Reminder Repository Port (Port Interface).
 * Pure TypeScript — No Prisma or UI imports.
 */

import type {
  CoordinatorMilestoneCode,
  DispatchReminderPolicyConfig,
  OrderReminderCalculationInput,
  TemplateReminderOverrides,
} from "./dispatch-reminder-types"

export interface OrderWithReminderData extends OrderReminderCalculationInput {
  templateOverrides?: TemplateReminderOverrides | null | undefined
}

export interface IDispatchReminderRepository {
  getActiveOrdersForReminders(
    organizationId: string
  ): Promise<OrderWithReminderData[]>

  getPolicyConfig(organizationId: string): Promise<DispatchReminderPolicyConfig>

  savePolicyConfig(
    organizationId: string,
    config: DispatchReminderPolicyConfig
  ): Promise<void>

  getTemplateOverrides(
    organizationId: string,
    productId: string
  ): Promise<TemplateReminderOverrides | null>

  saveTemplateOverrides(
    organizationId: string,
    productId: string,
    overrides: TemplateReminderOverrides
  ): Promise<void>

  acknowledgeMilestone(params: {
    organizationId: string
    orderId: string
    milestone: CoordinatorMilestoneCode
    action: "ACKNOWLEDGED" | "SNOOZED" | "DISMISSED"
    actorId?: string | undefined
    snoozeMinutes?: number | undefined
    note?: string | undefined
  }): Promise<void>
}
