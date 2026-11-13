/**
 * NOTIFICATION PREFERENCE REPOSITORY IMPLEMENTATION
 *
 * Hiện thực hoá INotificationPreferenceRepository thông qua Prisma.
 * Tuân thủ tiêu chuẩn Clean Architecture & Tenant Isolation.
 *
 * @module notification/infra
 */
import { prisma } from "@/core/tenancy/infra/prisma"
import type {
  NotifyChannel,
  NotifyPriority,
  NotificationTier,
  NotificationSubTier,
} from "../domain/events/_contract"
import type {
  ChannelActivationMap,
  HardLockEntry,
  PreferenceRecord,
} from "../domain/cascading-policy"
import type {
  INotificationPreferenceRepository,
  InboxItemRecord,
  CreateInboxItemInput,
  ListInboxOptions,
} from "../domain/repositories/notification-preference-repository.interface"
import { getNotificationInboxRepository } from "./notification-inbox-repository"
import { getNotificationHardLockRepository } from "./notification-hard-lock-repository"

export class NotificationPreferenceRepository implements INotificationPreferenceRepository {
  // ── Channel Activations (Mother only) ───────────────────────────────────
  async getChannelActivations(): Promise<ChannelActivationMap> {
    const rows = await prisma.notification_channel_activations.findMany()
    const result: ChannelActivationMap = { APP_INBOX: true }
    for (const r of rows) {
      result[r.channel] = r.activated
    }
    return result
  }

  async setChannelActivation(channel: string, activated: boolean, updatedBy: string): Promise<void> {
    await prisma.notification_channel_activations.upsert({
      where: { channel },
      create: { channel, activated, updated_by: updatedBy },
      update: { activated, updated_by: updatedBy },
    })
  }

  // ── Event Visibility Matrix (Mother only) ───────────────────────────────
  async getEventVisibilityMap(): Promise<Record<string, Record<NotificationSubTier, boolean>>> {
    const rows = await getNotificationHardLockRepository().listEventVisibility() // T-7b: governance_decisions
    const map: Record<string, Record<NotificationSubTier, boolean>> = {}
    for (const r of rows) {
      if (!map[r.event_key]) {
        map[r.event_key] = { INDUSTRY: true, CHAIN: true, STORE: true }
      }
      const entry = map[r.event_key]
      if (entry) {
        entry[r.tier as NotificationSubTier] = r.visible
      }
    }
    return map
  }

  async setEventVisibility(
    eventKey: string,
    tier: NotificationSubTier,
    visible: boolean,
    updatedBy: string
  ): Promise<void> {
    return getNotificationHardLockRepository().setEventVisibility(eventKey, tier, visible, updatedBy)
  }

  // ── Hard Locks (All tiers) ──────────────────────────────────────────────
  async getHardLocks(filter?: {
    tier?: NotificationTier | undefined
    scopeId?: string | undefined
    eventKey?: string | undefined
    channel?: NotifyChannel | undefined
  }): Promise<HardLockEntry[]> {
    return getNotificationHardLockRepository().getHardLocks(filter)
  }

  async setHardLock(lock: HardLockEntry & { lockedBy: string }): Promise<void> {
    return getNotificationHardLockRepository().setHardLock(lock)
  }

  async deleteHardLock(
    eventKey: string,
    channel: NotifyChannel,
    tier: NotificationTier,
    scopeId: string,
    removedBy: string | null = null
  ): Promise<void> {
    return getNotificationHardLockRepository().deleteHardLock(eventKey, channel, tier, scopeId, removedBy)
  }

  // ── Org Policies (Tier 2: SaaS Ngành / ChainOS) ─────────────────────────
  async getOrgPolicies(orgId: string): Promise<PreferenceRecord[]> {
    const rows = await prisma.notification_org_policies.findMany({
      where: { organization_id: orgId },
    })
    return rows.map((r) => ({
      eventKey: r.event_key,
      channel: r.channel as NotifyChannel,
      enabled: r.enabled,
      priority: (r.priority_override as NotifyPriority) ?? undefined,
    }))
  }

  async getOrgPolicy(
    orgId: string,
    eventKey: string,
    channel: NotifyChannel,
    roleKey: string
  ): Promise<PreferenceRecord | null> {
    const row = await prisma.notification_org_policies.findFirst({
      where: {
        organization_id: orgId,
        event_key: eventKey,
        channel,
        role_key: { in: [roleKey, "*"] },
      },
      orderBy: { role_key: "desc" }, // cụ thể hơn '*' xếp trước
    })
    if (!row) return null
    return {
      eventKey: row.event_key,
      channel: row.channel as NotifyChannel,
      enabled: row.enabled,
      priority: (row.priority_override as NotifyPriority) ?? undefined,
    }
  }

  async upsertOrgPolicy(record: {
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    roleKey: string
    enabled: boolean
    priorityOverride?: NotifyPriority
  }): Promise<void> {
    await prisma.notification_org_policies.upsert({
      where: {
        organization_id_event_key_channel_role_key: {
          organization_id: record.organizationId,
          event_key: record.eventKey,
          channel: record.channel,
          role_key: record.roleKey,
        },
      },
      create: {
        organization_id: record.organizationId,
        event_key: record.eventKey,
        channel: record.channel,
        role_key: record.roleKey,
        enabled: record.enabled,
        priority_override: record.priorityOverride ?? null,
      },
      update: {
        enabled: record.enabled,
        priority_override: record.priorityOverride ?? null,
      },
    })
  }

  // ── Store Defaults (Tier 3: StoreOS) ────────────────────────────────────
  async getStoreDefaults(orgId: string, roleKey?: string): Promise<PreferenceRecord[]> {
    const rows = await prisma.notification_store_defaults.findMany({
      where: {
        organization_id: orgId,
        ...(roleKey ? { role_key: { in: [roleKey, "*"] } } : {}),
      },
    })
    return rows.map((r) => ({
      eventKey: r.event_key,
      channel: r.channel as NotifyChannel,
      enabled: r.enabled,
    }))
  }

  async getStoreDefault(
    orgId: string,
    eventKey: string,
    channel: NotifyChannel,
    roleKey: string
  ): Promise<PreferenceRecord | null> {
    const row = await prisma.notification_store_defaults.findFirst({
      where: {
        organization_id: orgId,
        event_key: eventKey,
        channel,
        role_key: { in: [roleKey, "*"] },
      },
      orderBy: { role_key: "desc" },
    })
    if (!row) return null
    return {
      eventKey: row.event_key,
      channel: row.channel as NotifyChannel,
      enabled: row.enabled,
    }
  }

  async upsertStoreDefault(record: {
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    roleKey: string
    enabled: boolean
    scheduleStart?: string
    scheduleEnd?: string
  }): Promise<void> {
    await prisma.notification_store_defaults.upsert({
      where: {
        organization_id_event_key_channel_role_key: {
          organization_id: record.organizationId,
          event_key: record.eventKey,
          channel: record.channel,
          role_key: record.roleKey,
        },
      },
      create: {
        organization_id: record.organizationId,
        event_key: record.eventKey,
        channel: record.channel,
        role_key: record.roleKey,
        enabled: record.enabled,
        schedule_start: record.scheduleStart ?? null,
        schedule_end: record.scheduleEnd ?? null,
      },
      update: {
        enabled: record.enabled,
        schedule_start: record.scheduleStart ?? null,
        schedule_end: record.scheduleEnd ?? null,
      },
    })
  }

  // ── User Preferences (Tier 4: User) ─────────────────────────────────────
  async getUserPreferences(userId: string, orgId: string): Promise<PreferenceRecord[]> {
    const rows = await prisma.notification_user_preferences.findMany({
      where: { user_id: userId, organization_id: orgId },
    })
    return rows.map((r) => ({
      eventKey: r.event_key,
      channel: r.channel as NotifyChannel,
      enabled: r.enabled,
    }))
  }

  async getUserPreference(
    userId: string,
    orgId: string,
    eventKey: string,
    channel: NotifyChannel
  ): Promise<PreferenceRecord | null> {
    const row = await prisma.notification_user_preferences.findUnique({
      where: {
        user_id_organization_id_event_key_channel: {
          user_id: userId,
          organization_id: orgId,
          event_key: eventKey,
          channel,
        },
      },
    })
    if (!row) return null

    // Nếu đang trong thời gian mute, xem như enabled = false
    if (row.mute_until && row.mute_until > new Date()) {
      return {
        eventKey: row.event_key,
        channel: row.channel as NotifyChannel,
        enabled: false,
      }
    }

    return {
      eventKey: row.event_key,
      channel: row.channel as NotifyChannel,
      enabled: row.enabled,
    }
  }

  async upsertUserPreference(record: {
    userId: string
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    enabled: boolean
    muteUntil?: Date
  }): Promise<void> {
    await prisma.notification_user_preferences.upsert({
      where: {
        user_id_organization_id_event_key_channel: {
          user_id: record.userId,
          organization_id: record.organizationId,
          event_key: record.eventKey,
          channel: record.channel,
        },
      },
      create: {
        user_id: record.userId,
        organization_id: record.organizationId,
        event_key: record.eventKey,
        channel: record.channel,
        enabled: record.enabled,
        mute_until: record.muteUntil ?? null,
      },
      update: {
        enabled: record.enabled,
        mute_until: record.muteUntil ?? null,
      },
    })
  }

  // ── Inbox (In-App Notification Center) ──────────────────────────────────
  async createInboxItem(item: CreateInboxItemInput): Promise<{ id: string; createdAt: Date }> {
    return getNotificationInboxRepository().createInboxItem(item)
  }
  async markInboxRead(id: string, userId: string, orgId: string): Promise<boolean> {
    return getNotificationInboxRepository().markInboxRead(id, userId, orgId)
  }
  async markAllInboxRead(userId: string, orgId: string): Promise<number> {
    return getNotificationInboxRepository().markAllInboxRead(userId, orgId)
  }
  async listInboxItems(
    userId: string,
    orgId: string,
    options?: ListInboxOptions | undefined
  ): Promise<{ items: InboxItemRecord[]; total: number; unreadCount: number }> {
    return getNotificationInboxRepository().listInboxItems(userId, orgId, options)
  }
}

// Singleton factory
let repositoryInstance: NotificationPreferenceRepository | null = null

export function getNotificationPreferenceRepository(): INotificationPreferenceRepository {
  if (!repositoryInstance) {
    repositoryInstance = new NotificationPreferenceRepository()
  }
  return repositoryInstance
}
