/**
 * NOTIFICATION HARD LOCK REPOSITORY
 *
 * Khoá cứng + hiển thị sự kiện theo tầng, lưu ở `governance_decisions` (ADR-012 D-T10; T-7c bỏ bảng riêng). Phạm vi
 * lưu theo địa chỉ D-T5 (`platform`, `org:<id>`) — đổi qua lại với dạng domain ("GLOBAL", id tổ chức) ngay ở đây.
 *
 * @module notification/infra
 */
import { notificationLockRecord, notificationVisibilityRecord } from "@/core/governance/decision-record"
import { currentDecisions, recordDecisions } from "@/core/governance/infra/decision-log"
import { fromScopeKey, toScopeKey } from "@/core/governance/scope-key"
import { prisma } from "@/core/tenancy/infra/prisma"
import type {
  NotifyChannel,
  NotificationTier,
} from "../domain/events/_contract"
import type { HardLockEntry } from "../domain/cascading-policy"

export class NotificationHardLockRepository {
  async getHardLocks(filter?: {
    tier?: NotificationTier | undefined
    scopeId?: string | undefined
    eventKey?: string | undefined
    channel?: NotifyChannel | undefined
  }): Promise<HardLockEntry[]> {
    const records = await currentDecisions(prisma, {
      systems: ["notification.hard_lock"],
      ...(filter?.scopeId ? { scopes: [toScopeKey(filter.scopeId)] } : {}),
      ...(filter?.tier ? { tier: filter.tier } : {}),
      ...(filter?.eventKey && filter.channel ? { decisionKey: `${filter.eventKey}:${filter.channel}` } : {}),
    })
    return records.flatMap((r) => {
      const cut = r.decisionKey.lastIndexOf(":")
      const eventKey = r.decisionKey.slice(0, cut)
      const channel = r.decisionKey.slice(cut + 1) as NotifyChannel
      const enabled = r.value?.["enabled"]
      if (cut <= 0 || typeof enabled !== "boolean") return []
      if ((filter?.eventKey && filter.eventKey !== eventKey) || (filter?.channel && filter.channel !== channel)) return []
      const reason = r.value?.["reason"]
      return [{
        eventKey,
        channel,
        tier: r.tier as NotificationTier,
        scopeId: fromScopeKey(r.scope),
        enabled,
        reason: typeof reason === "string" ? reason : undefined,
      }]
    })
  }

  /** Mẹ ẩn/hiện sự kiện theo tầng (cùng tên trường với bảng cũ để nơi gọi không đổi). */
  async listEventVisibility(): Promise<Array<{ event_key: string; tier: string; visible: boolean }>> {
    const records = await currentDecisions(prisma, { systems: ["notification.visibility"], scopes: ["platform"] })
    return records.flatMap((r) => {
      const cut = r.decisionKey.lastIndexOf(":")
      const visible = r.value?.["visible"]
      return cut > 0 && typeof visible === "boolean" ? [{ event_key: r.decisionKey.slice(0, cut), tier: r.decisionKey.slice(cut + 1), visible }] : []
    })
  }

  /** Đặt khoá cứng — một dòng `governance_decisions` (ADR-012 T-7c: bảng `notification_hard_locks` đã bỏ). */
  async setHardLock(lock: HardLockEntry & { lockedBy: string }): Promise<void> {
    await recordDecisions(prisma, [notificationLockRecord({ ...lock, decidedBy: lock.lockedBy })])
  }

  /** Gỡ khoá cứng — dòng gỡ ghi người gỡ. */
  async deleteHardLock(
    eventKey: string,
    channel: NotifyChannel,
    tier: NotificationTier,
    scopeId: string,
    removedBy: string | null = null
  ): Promise<void> {
    await recordDecisions(prisma, [notificationLockRecord({ eventKey, channel, tier, scopeId, enabled: null, decidedBy: removedBy })])
  }

  /** Mẹ ẩn/hiện sự kiện ở một tầng dưới (T-7c: bảng `notification_event_visibility` đã bỏ). */
  async setEventVisibility(eventKey: string, tier: string, visible: boolean, updatedBy: string): Promise<void> {
    await recordDecisions(prisma, [notificationVisibilityRecord({ eventKey, targetTier: tier, visible, decidedBy: updatedBy })])
  }
}

let hardLockRepoInstance: NotificationHardLockRepository | null = null

export function getNotificationHardLockRepository(): NotificationHardLockRepository {
  if (!hardLockRepoInstance) {
    hardLockRepoInstance = new NotificationHardLockRepository()
  }
  return hardLockRepoInstance
}
