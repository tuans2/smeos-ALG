/**
 * MANAGE STORE DEFAULTS USE-CASE
 *
 * Dành cho Tier 3 (StoreOS) cấu hình cài đặt mặc định cửa hàng cho các vai.
 *
 * @module notification/use-cases
 */
import type { NotifyChannel } from "../domain/events/_contract"
import type { PreferenceRecord } from "../domain/cascading-policy"
import type { INotificationPreferenceRepository } from "../domain/repositories/notification-preference-repository.interface"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"

export async function getStoreNotificationDefaults(
  organizationId: string,
  roleKey?: string | undefined,
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<PreferenceRecord[]> {
  return repo.getStoreDefaults(organizationId, roleKey)
}

export async function updateStoreNotificationDefault(
  input: {
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    roleKey: string
    enabled: boolean
    scheduleStart?: string | undefined
    scheduleEnd?: string | undefined
  },
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<void> {
  await repo.upsertStoreDefault(input)
}
