/**
 * NOTIFICATION REPOSITORY PORT INTERFACES
 *
 * Định nghĩa hợp đồng truy xuất dữ liệu của module notification.
 * PURE TYPESCRIPT — Tuyệt đối không import Prisma (@/generated/prisma).
 *
 * @module notification/domain/repositories
 */
import type {
  NotifyChannel,
  NotifyPriority,
  NotificationTier,
  NotificationSubTier,
} from "../events/_contract"
import type {
  ChannelActivationMap,
  HardLockEntry,
  PreferenceRecord,
} from "../cascading-policy"

export interface InboxItemRecord {
  id: string
  userId: string
  organizationId: string
  eventKey: string
  title: string
  message: string
  deepLink?: string | null | undefined
  priority: string
  isRead: boolean
  readAt?: Date | null | undefined
  createdAt: Date
}

export interface CreateInboxItemInput {
  userId: string
  organizationId: string
  eventKey: string
  title: string
  message: string
  deepLink?: string | undefined
  priority?: NotifyPriority | undefined
}

export interface ListInboxOptions {
  page?: number | undefined
  limit?: number | undefined
  unreadOnly?: boolean | undefined
}

export interface INotificationPreferenceRepository {
  // ── Channel Activations (Mother only) ───────────────────────────────────
  getChannelActivations(): Promise<ChannelActivationMap>
  setChannelActivation(channel: string, activated: boolean, updatedBy: string): Promise<void>

  // ── Event Visibility Matrix (Mother only) ───────────────────────────────
  getEventVisibilityMap(): Promise<Record<string, Record<NotificationSubTier, boolean>>>
  setEventVisibility(
    eventKey: string,
    tier: NotificationSubTier,
    visible: boolean,
    updatedBy: string
  ): Promise<void>

  // ── Hard Locks (All tiers) ──────────────────────────────────────────────
  getHardLocks(filter?: {
    tier?: NotificationTier | undefined
    scopeId?: string | undefined
    eventKey?: string | undefined
    channel?: NotifyChannel | undefined
  } | undefined): Promise<HardLockEntry[]>
  setHardLock(lock: HardLockEntry & { lockedBy: string }): Promise<void>
  deleteHardLock(
    eventKey: string,
    channel: NotifyChannel,
    tier: NotificationTier,
    scopeId: string,
    removedBy?: string | null
  ): Promise<void>

  // ── Org Policies (Tier 2: SaaS Ngành / ChainOS) ─────────────────────────
  getOrgPolicies(orgId: string): Promise<PreferenceRecord[]>
  getOrgPolicy(
    orgId: string,
    eventKey: string,
    channel: NotifyChannel,
    roleKey: string
  ): Promise<PreferenceRecord | null>
  upsertOrgPolicy(record: {
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    roleKey: string
    enabled: boolean
    priorityOverride?: NotifyPriority | undefined
  }): Promise<void>

  // ── Store Defaults (Tier 3: StoreOS) ────────────────────────────────────
  getStoreDefaults(orgId: string, roleKey?: string | undefined): Promise<PreferenceRecord[]>
  getStoreDefault(
    orgId: string,
    eventKey: string,
    channel: NotifyChannel,
    roleKey: string
  ): Promise<PreferenceRecord | null>
  upsertStoreDefault(record: {
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    roleKey: string
    enabled: boolean
    scheduleStart?: string | undefined
    scheduleEnd?: string | undefined
  }): Promise<void>

  // ── User Preferences (Tier 4: User) ─────────────────────────────────────
  getUserPreferences(userId: string, orgId: string): Promise<PreferenceRecord[]>
  getUserPreference(
    userId: string,
    orgId: string,
    eventKey: string,
    channel: NotifyChannel
  ): Promise<PreferenceRecord | null>
  upsertUserPreference(record: {
    userId: string
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    enabled: boolean
    muteUntil?: Date | undefined
  }): Promise<void>

  // ── Inbox (In-App Notification Center) ──────────────────────────────────
  createInboxItem(item: CreateInboxItemInput): Promise<{ id: string; createdAt: Date }>
  markInboxRead(id: string, userId: string, orgId: string): Promise<boolean>
  markAllInboxRead(userId: string, orgId: string): Promise<number>
  listInboxItems(
    userId: string,
    orgId: string,
    options?: ListInboxOptions | undefined
  ): Promise<{ items: InboxItemRecord[]; total: number; unreadCount: number }>
}
