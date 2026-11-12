/**
 * USE NOTIFICATION MATRIX — Hook fetch dữ liệu ma trận + actions
 *
 * Hook này load events, preferences, hard locks từ API,
 * rồi build thành MatrixEventGroupSection[] cho UI component.
 */
"use client"

import { useMemo, useCallback } from "react"
import { useApi, apiSend } from "@/components/greeting-card/greeting-api"
import type {
  MatrixViewerTier,
  MatrixCellState,
  MatrixEventRow,
  MatrixEventGroupSection,
} from "./notification-matrix-types"
import { EVENT_GROUP_LABELS } from "./notification-matrix-types"
import type {
  NotifyChannel,
  NotificationTier,
  NotificationEventGroup,
  NotificationEventDefinition,
} from "@/modules/notification/domain/events/_contract"

/**
 * Shape trả về từ API hard-locks — camelCase
 * Match với HardLockEntry domain type trong cascading-policy.ts
 */
interface HardLockRecord {
  eventKey: string
  channel: string
  tier: string
  scopeId: string
  enabled: boolean
  reason?: string
}

/**
 * Shape trả về từ API policy/defaults — camelCase
 * Match với PreferenceRecord domain type trong cascading-policy.ts
 */
interface PolicyRecord {
  eventKey: string
  channel: string
  enabled: boolean
  priority?: string
}

interface UseNotificationMatrixParams {
  viewerTier: MatrixViewerTier
  scopeId: string
}

interface UseNotificationMatrixReturn {
  sections: MatrixEventGroupSection[]
  activeChannels: NotifyChannel[]
  loading: boolean
  error: string | null
  toggleCell: (eventKey: string, channel: NotifyChannel, enabled: boolean) => Promise<void>
  toggleHardLock: (eventKey: string, channel: NotifyChannel, enabled: boolean, reason?: string) => Promise<void>
  removeHardLock: (eventKey: string, channel: NotifyChannel) => Promise<void>
  refresh: () => void
}

/** API endpoints per tier */
function getApiPaths(tier: MatrixViewerTier): {
  events: string
  policy: string | null
  hardLocks: string
  channels: string
} {
  switch (tier) {
    case "MOTHER":
      return {
        // /events trả NotificationEventDefinition[] đầy đủ (có roleDefaults)
        // /visibility chỉ dùng để Mother configure visibility cho tầng dưới (khác mục đích)
        events: "/api/v1/platform/notification/events",
        // MOTHER không có policy endpoint riêng — dùng hard-locks làm proxy
        // (hard-locks đủ để render trạng thái bật/tắt ở tầng Mother)
        policy: null,
        hardLocks: "/api/v1/platform/notification/hard-locks",
        channels: "/api/v1/platform/notification/channels",
      }
    case "INDUSTRY":
    case "CHAIN":
      return {
        events: `/api/v1/notification/events?tier=${tier}`,
        policy: "/api/v1/notification/org-policy",
        hardLocks: "/api/v1/notification/org-hard-locks",
        channels: "/api/v1/notification/channels",
      }
    case "STORE":
      return {
        events: "/api/v1/notification/events?tier=STORE",
        policy: "/api/v1/notification/store-defaults",
        hardLocks: "/api/v1/notification/store-hard-locks",
        channels: "/api/v1/notification/channels",
      }
  }
}

/** Default channels luôn hiện */
const DEFAULT_CHANNELS: NotifyChannel[] = [
  "APP_INBOX",
  "EMAIL",
  "PUSH",
  "TELEGRAM",
]

export function useNotificationMatrix({
  viewerTier,
  scopeId,
}: UseNotificationMatrixParams): UseNotificationMatrixReturn {
  const paths = getApiPaths(viewerTier)

  // Fetch events visible to this tier
  const eventsRes = useApi<{ data: NotificationEventDefinition[] }>(paths.events)

  // Fetch hard locks
  const hardLocksRes = useApi<{ data: HardLockRecord[] }>(paths.hardLocks)

  // Fetch policies / defaults (null khi tier không có policy endpoint riêng)
  const policyRes = useApi<{ data: PolicyRecord[] }>(paths.policy ?? null)

  // Fetch active channels
  const channelsRes = useApi<{ data: Record<string, boolean> }>(paths.channels)

  // Chỉ báo loading khi events chưa có (quan trọng nhất)
  const loading = eventsRes.isLoading

  // Chỉ báo critical error khi events API fail
  // Policy/hardlocks errors được tolerate — fallback về defaults
  const error = eventsRes.error?.message ?? null

  const activeChannels = useMemo<NotifyChannel[]>(() => {
    const raw = channelsRes.data?.data
    if (!raw || Object.keys(raw).length === 0) return DEFAULT_CHANNELS
    const active = (Object.keys(raw) as NotifyChannel[]).filter((ch) => raw[ch] === true)
    return active.length > 0 ? active : DEFAULT_CHANNELS
  }, [channelsRes.data])

  // Build matrix sections
  const sections = useMemo<MatrixEventGroupSection[]>(() => {
    const events = eventsRes.data?.data ?? []
    // Tolerate errors: fallback về empty array nếu API phụ fail hoặc trả wrong format
    const rawHardLocks = hardLocksRes.data?.data
    const rawPolicies = policyRes.data?.data
    const hardLocks: HardLockRecord[] = Array.isArray(rawHardLocks) ? rawHardLocks : []
    const policies: PolicyRecord[] = Array.isArray(rawPolicies) ? rawPolicies : []

    if (events.length === 0) return []

    // Group events by NotificationEventGroup
    const groupMap = new Map<NotificationEventGroup, MatrixEventRow[]>()

    for (const evt of events) {
      const channels: Record<string, MatrixCellState> = {}

      for (const ch of activeChannels) {
        // Find hard lock (camelCase fields)
        const lock = hardLocks.find(
          (l) => l.eventKey === evt.key && l.channel === ch
        )

        // Find policy (camelCase fields)
        const pol = policies.find(
          (p) => p.eventKey === evt.key && p.channel === ch
        )

        // Determine hard lock status
        let hardLockedBy: NotificationTier | null = null
        let isOwnHardLock = false
        let hardLockReason: string | undefined

        if (lock) {
          hardLockedBy = lock.tier as NotificationTier
          isOwnHardLock = lock.tier === viewerTier
          hardLockReason = lock.reason
        }

        channels[ch] = {
          eventKey: evt.key,
          channel: ch as NotifyChannel,
          enabled: lock ? lock.enabled : (pol?.enabled ?? getDefaultEnabled(evt, ch)),
          priority: (pol?.priority as MatrixCellState["priority"]) ?? "NORMAL",
          decidedBy: lock ? `HARD_LOCK_${lock.tier}` : (pol ? viewerTier : "SYSTEM_DEFAULT"),
          hardLockedBy,
          hardLockReason,
          isOwnHardLock,
        }
      }

      const row: MatrixEventRow = {
        eventKey: evt.key,
        label: evt.label,
        description: evt.description,
        group: evt.group,
        tier: evt.tier,
        iconName: evt.iconName,
        channels,
      }

      if (!groupMap.has(evt.group)) {
        groupMap.set(evt.group, [])
      }
      groupMap.get(evt.group)!.push(row)
    }

    // Convert to sections
    return Array.from(groupMap.entries()).map(([groupKey, groupEvents]) => ({
      groupKey,
      groupLabel: EVENT_GROUP_LABELS[groupKey] ?? groupKey,
      events: groupEvents,
    }))
  }, [eventsRes.data, hardLocksRes.data, policyRes.data, activeChannels, viewerTier])

  // Actions
  const toggleCell = useCallback(
    async (eventKey: string, channel: NotifyChannel, enabled: boolean) => {
      if (!paths.policy) return // MOTHER tier không có policy endpoint riêng
      await apiSend(paths.policy, "PATCH", {
        event_key: eventKey,
        channel,
        role_key: "*",
        enabled,
      })
      await policyRes.mutate()
    },
    [paths.policy, policyRes]
  )

  const toggleHardLock = useCallback(
    async (
      eventKey: string,
      channel: NotifyChannel,
      enabled: boolean,
      reason?: string
    ) => {
      await apiSend(paths.hardLocks, "POST", {
        event_key: eventKey,
        channel,
        enabled,
        reason,
      })
      await hardLocksRes.mutate()
    },
    [paths.hardLocks, hardLocksRes]
  )

  const removeHardLock = useCallback(
    async (eventKey: string, channel: NotifyChannel) => {
      await apiSend(paths.hardLocks, "DELETE", {
        event_key: eventKey,
        channel,
      })
      await hardLocksRes.mutate()
    },
    [paths.hardLocks, hardLocksRes]
  )

  const refresh = useCallback(() => {
    eventsRes.mutate()
    hardLocksRes.mutate()
    policyRes.mutate()
    channelsRes.mutate()
  }, [eventsRes, hardLocksRes, policyRes, channelsRes])

  return {
    sections,
    activeChannels,
    loading,
    error,
    toggleCell,
    toggleHardLock,
    removeHardLock,
    refresh,
  }
}

/** Default enabled: APP_INBOX always on, others check roleDefaults (if available) */
function getDefaultEnabled(
  evt: NotificationEventDefinition & { roleDefaults?: { roleKey: string; channels: string[] }[] },
  channel: string
): boolean {
  if (channel === "APP_INBOX") return true
  // roleDefaults có thể không có nếu API trả EventVisibilityRow (platform tier)
  const roleDefaults = evt.roleDefaults ?? []
  const wildcard = roleDefaults.find((rd) => rd.roleKey === "*")
  if (wildcard) return wildcard.channels.includes(channel as NotifyChannel)
  // Fallback: nếu bất kỳ role nào include channel này → coi là enabled mặc định
  return roleDefaults.some((rd) => rd.channels.includes(channel as NotifyChannel))
}
