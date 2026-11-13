/**
 * MANAGE USER PREFERENCES USE-CASE
 *
 * Dành cho Tier 4 (Người dùng cá nhân) thiết lập nhận thông báo.
 * Thắng mọi mặc định của tầng trên trừ khi bị Hard Lock.
 *
 * @module notification/use-cases
 */
import type { NotifyChannel } from "../domain/events/_contract"
import type { PreferenceRecord } from "../domain/cascading-policy"
import type { INotificationPreferenceRepository } from "../domain/repositories/notification-preference-repository.interface"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"

export async function getUserNotificationPreferences(
  userId: string,
  organizationId: string,
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<PreferenceRecord[]> {
  return repo.getUserPreferences(userId, organizationId)
}

export async function updateUserNotificationPreference(
  input: {
    userId: string
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    enabled: boolean
    muteUntil?: Date | undefined
  },
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<void> {
  await repo.upsertUserPreference(input)
}
