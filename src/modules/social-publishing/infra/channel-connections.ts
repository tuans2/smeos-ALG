import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { SocialChannel } from "@/core/ports/publisher-provider"
import { openCredential, sealCredential } from "@/modules/integration-hub/infra/credential-vault"

/**
 * Kết nối kênh đăng bài của TỪNG tổ chức, lưu trong `integration_connections` của Trung tâm Tích hợp (không bảng mới):
 * mỗi kênh một đầu nối `social_<kênh>`, khoá (access/refresh token) mã hoá bằng kho bí mật riêng của đầu nối
 * (`credential-vault`), `external_account_id` = Page ID / IG user ID / OA ID / open_id. Không lưu mật khẩu nền tảng.
 */
export const SOCIAL_CONNECTOR_KEYS: Readonly<Record<SocialChannel, string>> = {
  facebook: "social_facebook",
  instagram: "social_instagram",
  zalo: "social_zalo",
  tiktok: "social_tiktok",
}

export interface CredentialBundle {
  readonly access_token: string
  readonly refresh_token?: string | null
  readonly access_expires_at?: string | null
  readonly refresh_expires_at?: string | null
}

export interface ActiveConnection {
  readonly id: string
  readonly channel: SocialChannel
  readonly accountId: string
  readonly displayName: string
  readonly bundle: CredentialBundle
  readonly updatedAt: Date
}

const USABLE = ["ACTIVE", "DEGRADED"] as const

function parseBundle(connectorKey: string, encrypted: string | null): CredentialBundle | null {
  if (!encrypted) return null
  try {
    const v = JSON.parse(openCredential(connectorKey, encrypted)) as Partial<CredentialBundle>
    return typeof v.access_token === "string" && v.access_token ? (v as CredentialBundle) : null
  } catch {
    return null
  }
}

/** Kết nối dùng được của một tổ chức cho một kênh (lượt cron — đọc theo `organization_id` của chính bài). */
export async function findActiveConnection(organizationId: string, channel: SocialChannel): Promise<ActiveConnection | null> {
  const key = SOCIAL_CONNECTOR_KEYS[channel]
  const row = await prisma.integration_connections.findFirst({
    where: { organization_id: organizationId, connector_key: key, status: { in: [...USABLE] } },
    orderBy: { updated_at: "desc" },
  })
  const bundle = row ? parseBundle(key, row.credential_encrypted) : null
  if (!row || !bundle) return null
  return { id: row.id, channel, accountId: row.external_account_id, displayName: row.display_name, bundle, updatedAt: row.updated_at }
}

/** Kết nối hết hạn / bị thu hồi phía nền tảng → EXPIRED, giao diện nhắc kết nối lại. */
export async function markConnectionExpired(id: string, code: string): Promise<void> {
  await prisma.integration_connections.updateMany({ where: { id, status: { in: [...USABLE] } }, data: { status: "EXPIRED", last_error_code: code } })
}

/** Lưu khoá mới sau khi làm mới token — chỉ khi chưa ai ghi trước (khoá lạc quan theo `updated_at`). */
export async function saveRefreshedBundle(conn: ActiveConnection, bundle: CredentialBundle): Promise<boolean> {
  const key = SOCIAL_CONNECTOR_KEYS[conn.channel]
  const sealed = sealCredential(key, JSON.stringify(bundle))
  const r = await prisma.integration_connections.updateMany({
    where: { id: conn.id, updated_at: conn.updatedAt },
    data: { credential_encrypted: sealed.encrypted, credential_hint: sealed.hint, expires_at: bundle.access_expires_at ? new Date(bundle.access_expires_at) : null, last_error_code: null },
  })
  return r.count === 1
}

export interface ChannelStatusRow {
  readonly channel: SocialChannel
  readonly connected: boolean
  /** ACTIVE | DEGRADED | EXPIRED | ERROR | DISCONNECTED … hoặc null khi chưa từng kết nối */
  readonly status: string | null
  readonly displayName: string | null
  readonly expiresAt: string | null
}

/** Trạng thái 4 kênh của tổ chức đang đăng nhập (không trả khoá). */
export async function channelStatuses(ctx: TenantContext): Promise<ChannelStatusRow[]> {
  const rows = await prisma.integration_connections.findMany({
    where: scopedWhere(ctx, { connector_key: { in: Object.values(SOCIAL_CONNECTOR_KEYS) } }),
    orderBy: { updated_at: "desc" },
    select: { connector_key: true, status: true, display_name: true, expires_at: true },
  })
  return (Object.keys(SOCIAL_CONNECTOR_KEYS) as SocialChannel[]).map((channel) => {
    const row = rows.find((r) => r.connector_key === SOCIAL_CONNECTOR_KEYS[channel])
    return {
      channel,
      connected: Boolean(row && (USABLE as readonly string[]).includes(row.status)),
      status: row?.status ?? null,
      displayName: row?.display_name ?? null,
      expiresAt: row?.expires_at?.toISOString() ?? null,
    }
  })
}
