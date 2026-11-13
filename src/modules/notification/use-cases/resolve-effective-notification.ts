/**
 * RESOLVE EFFECTIVE NOTIFICATION USE-CASE
 *
 * Tải dữ liệu từ DB và chạy thuật toán Cascading Bottom-up Override + Hard Lock.
 *
 * @module notification/use-cases
 */
import type { NotifyChannel } from "../domain/events/_contract"
import {
  resolveCascadingPreference,
  type ResolveResult,
  type PreferenceRecord,
} from "../domain/cascading-policy"
import { getNotificationEvent } from "../domain/events"
import type { INotificationPreferenceRepository } from "../domain/repositories/notification-preference-repository.interface"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"

export interface ResolveEffectiveNotificationInput {
  eventKey: string
  channel: NotifyChannel
  userId: string
  roleKey: string
  storeOrgId: string
  parentOrgId?: string | undefined
  /**
   * Chuỗi cha chính của tổ chức nhận: khoá cứng CHAIN/INDUSTRY đặt ở chuỗi này áp xuống (P2-A11, PO 06/11/2026).
   * Chỉ dùng cho phạm vi khoá — chính sách tổ chức (`orgPolicy`) vẫn chỉ đọc theo `parentOrgId`.
   */
  lockParentOrgId?: string | undefined
}

export async function resolveEffectiveNotification(
  input: ResolveEffectiveNotificationInput,
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<ResolveResult> {
  const { eventKey, channel, userId, roleKey, storeOrgId, parentOrgId } = input

  // 1. Tải channel activations
  const channelActivations = await repo.getChannelActivations()

  // 2. Tải tất cả hard locks liên quan
  const hardLocks = await repo.getHardLocks({ eventKey, channel })

  // 3. Tải User Preference (nếu có)
  const userPreference = await repo.getUserPreference(userId, storeOrgId, eventKey, channel)

  // 4. Tải Store Default (nếu có)
  const storeDefault = await repo.getStoreDefault(storeOrgId, eventKey, channel, roleKey)

  // 5. Tải Org Policy (nếu có parentOrgId hoặc storeOrgId)
  let orgPolicy: PreferenceRecord | null = null
  if (parentOrgId) {
    orgPolicy = await repo.getOrgPolicy(parentOrgId, eventKey, channel, roleKey)
  }
  if (!orgPolicy) {
    orgPolicy = await repo.getOrgPolicy(storeOrgId, eventKey, channel, roleKey)
  }

  // 6. Lấy Mother Default từ Event Registry
  const eventDef = getNotificationEvent(eventKey)
  let motherDefault: PreferenceRecord | null = null
  if (eventDef) {
    const roleDef =
      eventDef.roleDefaults.find((r) => r.roleKey === roleKey) ??
      eventDef.roleDefaults.find((r) => r.roleKey === "*")
    if (roleDef) {
      motherDefault = {
        eventKey,
        channel,
        enabled: roleDef.channels.includes(channel),
        priority: roleDef.priority,
      }
    }
  }

  // 7. Thực hiện Cascading Resolution (pure domain function)
  return resolveCascadingPreference({
    eventKey,
    channel,
    userId,
    roleKey,
    storeOrgId,
    parentOrgId: parentOrgId ?? input.lockParentOrgId,
    channelActivations,
    hardLocks,
    userPreference,
    storeDefault,
    orgPolicy,
    motherDefault,
  })
}
