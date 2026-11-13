/**
 * Hợp đồng một đầu nối (connector) cài đặt. Mọi lời gọi ra ngoài phải có timeout và
 * đi qua `withCircuitBreaker`; không phương thức nào được ghi log bí mật.
 */

import type { ChannelListing, ListingSyncResult } from "@/core/ports/sales-channel-catalog-provider"
import type { ChannelAvailability, ChannelOrder } from "@/core/ports/sales-channel-order-provider"

export interface ConnectorCredential {
  /** Bí mật dạng rõ — chỉ tồn tại trong bộ nhớ của use-case, không bao giờ trả về client. */
  readonly secret: string
}

export interface ConnectResult {
  readonly externalAccountId: string
  readonly displayName: string
  readonly config: Record<string, unknown>
  readonly expiresAt?: Date | null
}

export interface HealthResult {
  readonly ok: boolean
  readonly expired?: boolean
  readonly transient?: boolean
  readonly errorCode?: string
}

export interface InboundRequest {
  readonly rawBody: string
  readonly headers: Headers
}

export interface ParsedInboundEvent {
  readonly externalEventId: string | null
  readonly eventType: string
  readonly payload: unknown
}

export interface Connector {
  readonly key: string
  /** Xác thực khoá/token người dùng nhập; trả thông tin tài khoản ngoài. */
  connectWithSecret?(secret: string, input: Record<string, unknown>): Promise<ConnectResult>
  testConnection(credential: ConnectorCredential, config: Record<string, unknown>): Promise<HealthResult>
  /** Thu hồi quyền phía nhà cung cấp khi ngắt kết nối (nếu nhà cung cấp hỗ trợ). */
  revoke?(credential: ConnectorCredential): Promise<void>
  verifyWebhook?(request: InboundRequest, credential: ConnectorCredential, now: Date): boolean
  parseWebhook?(request: InboundRequest): ParsedInboundEvent[]
  /** Xử lý một sự kiện đã ghi nhận; ném lỗi để kích hoạt thử lại. */
  processEvent?(event: { eventType: string; payload: unknown }): Promise<void>
  /** Có khi đầu nối là kênh bán hàng. Sự kiện `order.*` được Hub xử lý bằng `getOrder` + nhập đơn. */
  sales?: SalesChannelOps
}

/** Phần kênh bán hàng của một đầu nối (GĐ4A). Mỗi phương thức nhận khoá đã mở trong use-case. */
export interface SalesChannelOps {
  upsertListings(credential: ConnectorCredential, config: Record<string, unknown>, listings: readonly ChannelListing[]): Promise<ListingSyncResult[]>
  removeListings(credential: ConnectorCredential, config: Record<string, unknown>, externalIds: readonly string[]): Promise<void>
  getOrder(credential: ConnectorCredential, config: Record<string, unknown>, externalOrderId: string): Promise<ChannelOrder | null>
  /** Lượt kéo dự phòng khi webhook lỡ: đơn mới hơn `cursor`, tối đa `MAX_ORDERS_PER_PULL`. */
  pullOrders(credential: ConnectorCredential, config: Record<string, unknown>, cursor: string | null): Promise<{ orders: ChannelOrder[]; nextCursor: string | null }>
  pushAvailability(credential: ConnectorCredential, config: Record<string, unknown>, items: readonly ChannelAvailability[]): Promise<void>
}
