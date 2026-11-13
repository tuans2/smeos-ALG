import type { ConnectionStatus } from "./connection-lifecycle"

export interface ConnectionView {
  readonly id: string
  readonly connectorKey: string
  readonly externalAccountId: string
  readonly displayName: string
  readonly status: ConnectionStatus
  readonly config: Record<string, unknown>
  readonly credentialHint: string | null
  readonly connectionRef: string
  readonly expiresAt: string | null
  readonly lastHealthAt: string | null
  readonly lastErrorCode: string | null
  readonly createdAt: string
  /** true = dòng theo dõi của tích hợp MANAGED: chỉ xem nhật ký, quản lý qua panel sẵn có. */
  readonly managed: boolean
}

export type EventStatus = "PENDING" | "DONE" | "FAILED" | "DEAD"

export interface EventView {
  readonly id: string
  readonly connectionId: string
  readonly direction: "IN" | "OUT"
  readonly eventType: string
  readonly status: EventStatus
  readonly attempts: number
  readonly nextRetryAt: string | null
  readonly errorCode: string | null
  readonly payload: unknown
  readonly createdAt: string
}

export type ListingStatus = "PENDING" | "SYNCED" | "REJECTED" | "REMOVED"

export interface ListingView {
  readonly productId: string
  readonly externalId: string | null
  readonly status: ListingStatus
  readonly lastError: string | null
  readonly lastSyncedAt: string | null
}

export interface ChannelOrderView {
  readonly externalOrderId: string
  readonly orderId: string | null
  readonly status: "IMPORTED" | "FAILED"
  readonly errorCode: string | null
  readonly createdAt: string
}
