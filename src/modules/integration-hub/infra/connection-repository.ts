/**
 * Kết nối tích hợp — mọi truy vấn của tổ chức đi qua `scopedWhere`; bản ghi của tổ chức khác = không tồn tại.
 * DTO trả ra KHÔNG BAO GIỜ chứa `credential_encrypted`.
 */

import { randomBytes } from "node:crypto"
import type { Prisma, integration_connections } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { ConnectionStatus } from "../domain/connection-lifecycle"
import type { ConnectionView } from "../domain/integration-views"

export type { ConnectionView }

/** `config.source` của kết nối theo dõi tích hợp chạy bằng phân hệ sẵn có (không giữ khoá). */
export const MANAGED_SOURCE = "managed"

/** Bản ghi nội bộ kèm bản mã — chỉ dùng trong use-case. */
export interface ConnectionRecord extends ConnectionView {
  readonly organizationId: string
  readonly credentialEncrypted: string | null
}

function toRecord(row: integration_connections): ConnectionRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    connectorKey: row.connector_key,
    externalAccountId: row.external_account_id,
    displayName: row.display_name,
    status: row.status,
    config: (row.config as Record<string, unknown> | null) ?? {},
    credentialHint: row.credential_hint,
    credentialEncrypted: row.credential_encrypted,
    connectionRef: row.connection_ref,
    expiresAt: row.expires_at?.toISOString() ?? null,
    lastHealthAt: row.last_health_at?.toISOString() ?? null,
    lastErrorCode: row.last_error_code,
    createdAt: row.created_at.toISOString(),
    managed: (row.config as Record<string, unknown> | null)?.["source"] === MANAGED_SOURCE,
  }
}

export function toView(record: ConnectionRecord): ConnectionView {
  const { credentialEncrypted: _c, organizationId: _o, ...view } = record
  return view
}

export interface CreateConnectionInput {
  connectorKey: string
  scopeTier: string
  externalAccountId: string
  displayName: string
  status: ConnectionStatus
  config: Record<string, unknown>
  credentialEncrypted: string | null
  credentialHint: string | null
  expiresAt: Date | null
}

export class ConnectionRepository {
  async list(ctx: TenantContext): Promise<ConnectionRecord[]> {
    const rows = await prisma.integration_connections.findMany({
      where: scopedWhere(ctx, { status: { not: "DISCONNECTED" as const } }),
      orderBy: { created_at: "asc" },
      take: 100,
    })
    return rows.map(toRecord)
  }

  async get(ctx: TenantContext, id: string): Promise<ConnectionRecord | null> {
    const row = await prisma.integration_connections.findFirst({ where: scopedWhere(ctx, { id }) })
    return row ? toRecord(row) : null
  }

  async create(ctx: TenantContext, input: CreateConnectionInput): Promise<ConnectionRecord> {
    const data = scopedData(ctx, {
      connector_key: input.connectorKey,
      scope_tier: input.scopeTier,
      external_account_id: input.externalAccountId,
      display_name: input.displayName,
      status: input.status,
      config: input.config as Prisma.InputJsonObject,
      credential_encrypted: input.credentialEncrypted,
      credential_hint: input.credentialHint,
      connection_ref: randomBytes(24).toString("base64url"),
      expires_at: input.expiresAt,
      created_by: ctx.userId,
    })
    return toRecord(await prisma.integration_connections.create({ data }))
  }

  async update(
    ctx: TenantContext,
    id: string,
    patch: Partial<{
      status: ConnectionStatus
      displayName: string
      config: Record<string, unknown>
      credentialEncrypted: string | null
      credentialHint: string | null
      lastHealthAt: Date
      lastErrorCode: string | null
    }>
  ): Promise<ConnectionRecord | null> {
    const res = await prisma.integration_connections.updateMany({
      where: scopedWhere(ctx, { id }),
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
        ...(patch.config !== undefined ? { config: patch.config as Prisma.InputJsonObject } : {}),
        ...(patch.credentialEncrypted !== undefined ? { credential_encrypted: patch.credentialEncrypted } : {}),
        ...(patch.credentialHint !== undefined ? { credential_hint: patch.credentialHint } : {}),
        ...(patch.lastHealthAt !== undefined ? { last_health_at: patch.lastHealthAt } : {}),
        ...(patch.lastErrorCode !== undefined ? { last_error_code: patch.lastErrorCode } : {}),
      },
    })
    return res.count === 0 ? null : this.get(ctx, id)
  }

  /** Webhook công khai: tra theo mã ngẫu nhiên trong URL, không theo tổ chức (chưa có phiên). */
  async findByRef(connectorKey: string, connectionRef: string): Promise<ConnectionRecord | null> {
    const row = await prisma.integration_connections.findUnique({ where: { connection_ref: connectionRef } })
    return row && row.connector_key === connectorKey ? toRecord(row) : null
  }

  /**
   * Dòng theo dõi cho tích hợp MANAGED (webhook riêng, xuyên tổ chức — `organizationId` đến từ cấu hình
   * kênh đã xác thực chữ ký, không từ client). Không lưu khoá. Tạo một lần, các lần sau dùng lại.
   */
  async ensureManaged(input: {
    organizationId: string
    connectorKey: string
    externalAccountId: string
    displayName: string
  }): Promise<ConnectionRecord> {
    const row = await prisma.integration_connections.upsert({
      where: {
        organization_id_connector_key_external_account_id: {
          organization_id: input.organizationId,
          connector_key: input.connectorKey,
          external_account_id: input.externalAccountId,
        },
      },
      create: {
        organization_id: input.organizationId,
        connector_key: input.connectorKey,
        scope_tier: "MANAGED",
        external_account_id: input.externalAccountId,
        display_name: input.displayName,
        status: "ACTIVE",
        config: { source: MANAGED_SOURCE },
        connection_ref: randomBytes(24).toString("base64url"),
        created_by: "system",
      },
      update: {},
    })
    return toRecord(row)
  }

  /** Lượt xử lý sự kiện (cron, xuyên tổ chức) — id đến từ chính bản ghi sự kiện, không từ client. */
  async findByIdSystem(id: string): Promise<ConnectionRecord | null> {
    const row = await prisma.integration_connections.findUnique({ where: { id } })
    return row ? toRecord(row) : null
  }

  /** Lượt kiểm sức khoẻ (cron, xuyên tổ chức): kết nối lâu chưa kiểm nhất trước. */
  async listForHealthCheck(limit: number, checkedBefore: Date): Promise<ConnectionRecord[]> {
    const rows = await prisma.integration_connections.findMany({
      where: {
        status: { in: ["ACTIVE", "DEGRADED", "EXPIRED", "ERROR"] },
        OR: [{ last_health_at: null }, { last_health_at: { lt: checkedBefore } }],
      },
      orderBy: { last_health_at: { sort: "asc", nulls: "first" } },
      take: limit,
    })
    return rows.map(toRecord)
  }

  async setHealthSystem(id: string, status: ConnectionStatus, errorCode: string | null, at: Date): Promise<void> {
    await prisma.integration_connections.update({
      where: { id },
      data: { status, last_error_code: errorCode, last_health_at: at },
    })
  }
}

let _repo: ConnectionRepository | null = null
export function getConnectionRepository(): ConnectionRepository {
  if (!_repo) _repo = new ConnectionRepository()
  return _repo
}
