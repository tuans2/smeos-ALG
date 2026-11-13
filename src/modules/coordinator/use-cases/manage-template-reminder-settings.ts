/**
 * Use-Case: Manage Template Reminder Overrides.
 * Xem và cập nhật cấu hình ghi đè nhắc việc theo từng sản phẩm / Thẻ chào.
 */

import type { IDispatchReminderRepository } from "../domain/dispatch-reminder-repository-port"
import type { TemplateReminderOverrides } from "../domain/dispatch-reminder-types"

export async function getTemplateReminderOverrides(
  organizationId: string,
  productId: string,
  repository: IDispatchReminderRepository
): Promise<TemplateReminderOverrides | null> {
  return repository.getTemplateOverrides(organizationId, productId)
}

export async function updateTemplateReminderOverrides(
  organizationId: string,
  productId: string,
  overrides: TemplateReminderOverrides,
  repository: IDispatchReminderRepository
): Promise<TemplateReminderOverrides> {
  await repository.saveTemplateOverrides(organizationId, productId, overrides)
  return overrides
}
