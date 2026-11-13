/**
 * MANAGE HARD LOCKS USE-CASE
 *
 * Mọi tầng đều có quyền đặt Hard Lock:
 * Mother → Industry → Chain → Store
 * Khóa cascading xuống tất cả tầng bên dưới.
 *
 * @module notification/use-cases
 */
import type { NotificationTier, NotifyChannel } from "../domain/events/_contract"
import type { HardLockEntry } from "../domain/cascading-policy"
import type { INotificationPreferenceRepository } from "../domain/repositories/notification-preference-repository.interface"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"

export interface SetHardLockInput {
  eventKey: string
  channel: NotifyChannel
  tier: NotificationTier
  scopeId: string
  enabled: boolean
  lockedBy: string
  reason?: string | undefined
}

export async function listHardLocks(
  filter: {
    tier?: NotificationTier | undefined
    scopeId?: string | undefined
    eventKey?: string | undefined
  },
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<HardLockEntry[]> {
  return repo.getHardLocks(filter)
}

export async function setHardLock(
  input: SetHardLockInput,
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<void> {
  // Validate scopeId format
  if (input.tier === "MOTHER" && input.scopeId !== "GLOBAL") {
    throw new Error("Mother Hard Lock phải có scopeId là 'GLOBAL'")
  }

  await repo.setHardLock({
    eventKey: input.eventKey,
    channel: input.channel,
    tier: input.tier,
    scopeId: input.scopeId,
    enabled: input.enabled,
    lockedBy: input.lockedBy,
    reason: input.reason,
  })
}

export async function removeHardLock(
  input: {
    eventKey: string
    channel: NotifyChannel
    tier: NotificationTier
    scopeId: string
    /** Người gỡ — ghi vào dòng gỡ của `governance_decisions` (ADR-012 T-7a). */
    removedBy?: string | undefined
  },
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<void> {
  await repo.deleteHardLock(input.eventKey, input.channel, input.tier, input.scopeId, input.removedBy ?? null)
}
