/**
 * Use-Case: Manage Dispatch Reminder Policy.
 * Xem và cập nhật cấu hình chính sách nhắc việc cấp tổ chức.
 */

import type { IDispatchReminderRepository } from "../domain/dispatch-reminder-repository-port"
import type { DispatchReminderPolicyConfig } from "../domain/dispatch-reminder-types"

export async function getReminderPolicyConfig(
  organizationId: string,
  repository: IDispatchReminderRepository
): Promise<DispatchReminderPolicyConfig> {
  return repository.getPolicyConfig(organizationId)
}

export async function updateReminderPolicyConfig(
  organizationId: string,
  config: Partial<DispatchReminderPolicyConfig>,
  repository: IDispatchReminderRepository
): Promise<DispatchReminderPolicyConfig> {
  const current = await repository.getPolicyConfig(organizationId)

  const updated: DispatchReminderPolicyConfig = {
    m0MinutesAfterPaid: Math.max(0, config.m0MinutesAfterPaid ?? current.m0MinutesAfterPaid),
    m1MinutesBeforeDelivery: Math.max(
      0,
      config.m1MinutesBeforeDelivery ?? current.m1MinutesBeforeDelivery
    ),
    m2MinutesBeforeDelivery: Math.max(
      0,
      config.m2MinutesBeforeDelivery ?? current.m2MinutesBeforeDelivery
    ),
    m3MinutesAfterShipperAssigned: Math.max(
      0,
      config.m3MinutesAfterShipperAssigned ?? current.m3MinutesAfterShipperAssigned
    ),
    m5MinutesAfterDelivery: Math.max(
      0,
      config.m5MinutesAfterDelivery ?? current.m5MinutesAfterDelivery
    ),
  }

  await repository.savePolicyConfig(organizationId, updated)
  return updated
}
