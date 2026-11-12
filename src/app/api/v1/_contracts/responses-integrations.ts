import { z } from "zod"
import { actionDone } from "./responses-actions"

import { GOVERNANCE_TIERS } from "@/core/governance/layered-resolver"

/**
 * Phản hồi `/api/v1/integrations/*`, `/api/v1/integration-tokens/*`, `/api/v1/sso/refresh` (OpenAPI nội bộ, PO
 * 07/11/2026). Sinh từ kiểu TS của `integration-hub` (integration-views, connector-manifest, catalog-availability,
 * integration-governance) và `integration` (token), đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở
 * `tests/tenant/internal-contract-integrations.test.ts`. Không phản hồi nào chứa khoá đã lưu — chỉ `credentialHint`
 * (4 ký tự cuối); giá trị token tích hợp chỉ xuất hiện đúng một lần khi cấp/xoay.
 */
const timestamp = z.iso.datetime()
const GOV_MODE = z.enum(["FORBID", "INHERIT_ONLY", "ALLOW_OWN"])

const connection = z.strictObject({
  id: z.string(),
  connectorKey: z.string(),
  externalAccountId: z.string(),
  displayName: z.string(),
  status: z.enum(["DRAFT", "CONNECTING", "ACTIVE", "DEGRADED", "EXPIRED", "ERROR", "DISCONNECTED", "DISABLED_BY_UPPER"]),
  config: z.record(z.string(), z.unknown()),
  credentialHint: z.string().nullable(),
  /** Mã công khai nằm trong URL webhook nhận sự kiện của kết nối. */
  connectionRef: z.string(),
  expiresAt: timestamp.nullable(),
  lastHealthAt: timestamp.nullable(),
  lastErrorCode: z.string().nullable(),
  createdAt: timestamp,
  /** `true` = dòng theo dõi của tích hợp chạy bằng phân hệ sẵn có — chỉ xem nhật ký. */
  managed: z.boolean(),
})
export const connectionResponse = z.strictObject({ connection })

export const hubResponse = z.strictObject({
  overview: z.strictObject({ active: z.number(), needsAttention: z.number(), failedEvents24h: z.number() }),
  catalog: z.array(
    z.strictObject({
      key: z.string(),
      category: z.enum(["SALES_CHANNEL", "MESSAGING", "PAYMENT", "NOTIFICATION", "LOGISTICS_INVOICE", "CHAIN_STORE", "API_WEBHOOK"]),
      label: z.string(),
      description: z.string(),
      availability: z.enum(["HIDDEN", "LOCKED_BY_UPPER", "NOT_FOR_TIER", "INHERITED", "NEEDS_UPGRADE", "COMING_SOON", "LEGACY", "CONNECTED", "AVAILABLE"]),
      canConnect: z.boolean(),
      auth: z.enum(["OAUTH2", "API_KEY", "BOT_TOKEN", "WEBHOOK_KEY", "INTERNAL"]),
      legacyHref: z.string().nullable(),
      panel: z.enum(["chat_channels", "bank_sync", "customer_notify", "staff_telegram", "api_tokens"]).nullable(),
    })
  ),
  connections: z.array(connection),
  managedLogs: z.array(connection),
  inherited: z.array(z.strictObject({ connectorKey: z.string(), displayName: z.string() })),
  managedConnected: z.array(z.string()),
})

export const eventsResponse = z.strictObject({
  events: z.array(
    z.strictObject({
      id: z.string(),
      organizationId: z.string(),
      connectionId: z.string(),
      direction: z.enum(["IN", "OUT"]),
      eventType: z.string(),
      status: z.enum(["PENDING", "DONE", "FAILED", "DEAD"]),
      attempts: z.number(),
      nextRetryAt: timestamp.nullable(),
      errorCode: z.string().nullable(),
      payload: z.unknown(),
      createdAt: timestamp,
    })
  ),
})

const listing = z.strictObject({
  productId: z.string(),
  externalId: z.string().nullable(),
  status: z.enum(["PENDING", "SYNCED", "REJECTED", "REMOVED"]),
  /** Lý do kênh/máy chủ từ chối, vd. "Chưa có ảnh". */
  lastError: z.string().nullable(),
  lastSyncedAt: timestamp.nullable(),
})
export const listingsResponse = z.strictObject({ listings: z.array(listing) })
export const salesResponse = z.strictObject({
  listings: z.array(listing),
  orders: z.array(
    z.strictObject({ externalOrderId: z.string(), orderId: z.string().nullable(), status: z.enum(["IMPORTED", "FAILED"]), errorCode: z.string().nullable(), createdAt: timestamp })
  ),
})
/** Số tin đã đẩy trạng thái còn/hết hàng. */
export const availabilityResponse = z.strictObject({ updated: z.number() })

export const governanceResponse = z.strictObject({
  items: z.array(
    z.strictObject({ connectorKey: z.string(), label: z.string(), mode: GOV_MODE, lockedByUpper: z.enum(GOVERNANCE_TIERS).nullable(), upperMode: GOV_MODE })
  ),
})

export const tokensResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      id: z.string(),
      client: z.enum(["LOCALBUDD", "SOCIALFLOW"]),
      created_at: timestamp,
      expires_at: timestamp.nullable(),
      revoked_at: timestamp.nullable(),
      rotated_from_id: z.string().nullable(),
    })
  ),
})
/** Cấp mới có `client`; xoay có `rotated_from_id` (token cũ KHÔNG bị thu hồi). `token` chỉ trả đúng một lần. */
export const tokenIssuedResponse = z.strictObject({
  id: z.string(),
  client: z.enum(["LOCALBUDD", "SOCIALFLOW"]).optional(),
  token: z.string(),
  expires_at: timestamp.nullable(),
  rotated_from_id: z.string().optional(),
})

/** `expires_at`: giây Unix (khác các mốc giờ ISO khác). */
export const ssoRefreshResponse = z.strictObject({ sso_token: z.string(), expires_at: z.number() })
export const disconnectedResponse = actionDone("disconnected")
export const replayedResponse = actionDone("replayed")
export const unpublishedResponse = actionDone("unpublished")
export const revokedResponse = actionDone("revoked")
