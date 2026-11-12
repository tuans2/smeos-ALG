/**
 * Kết nối / ngắt / xoay khoá / kiểm tra kết nối. Kết nối và ngắt là hành động R3 (ConfirmDialog ở UI).
 * Quyền: W2 (kết nối, ngắt) · W3 (xoay khoá, kiểm tra). Mọi thay đổi ghi audit, không ghi bí mật.
 */

import { requireCapability } from "@/core/rbac/capabilities"
import { AppError, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { availabilityOf, canStartConnect } from "../domain/catalog-availability"
import { findManifest } from "../domain/connector-catalog"
import { canTransition, statusAfterHealthCheck } from "../domain/connection-lifecycle"
import { openCredential, sealCredential } from "../infra/credential-vault"
import { toView, type ConnectionRecord, type ConnectionView } from "../infra/connection-repository"
import { defaultHubDeps, type HubDeps } from "./hub-deps"
import { loadGovernanceView } from "./governance-mode"

const AUDIT_ENTITY = "integration_connection"

async function loadOwned(ctx: TenantContext, id: string, deps: HubDeps): Promise<ConnectionRecord> {
  const record = await deps.connections.get(ctx, id)
  if (!record || record.status === "DISCONNECTED") throw notFound()
  if (record.managed) throw new AppError("UNPROCESSABLE_ENTITY", "Kết nối này quản lý ở mục Quản lý của dịch vụ")
  return record
}

function connectorFor(key: string, deps: HubDeps) {
  const connector = deps.getConnector(key)
  if (!connector) throw new AppError("UNPROCESSABLE_ENTITY", "Dịch vụ này chưa kết nối được tại đây")
  return connector
}

export async function connectWithSecret(
  ctx: TenantContext,
  input: { connectorKey: string; secret: string; options?: Record<string, unknown> },
  deps: HubDeps = defaultHubDeps()
): Promise<ConnectionView> {
  requireCapability(ctx, "W2")
  const manifest = findManifest(input.connectorKey)
  if (!manifest) throw notFound()
  if (manifest.auth === "OAUTH2" || manifest.auth === "INTERNAL") {
    throw new AppError("UNPROCESSABLE_ENTITY", "Dịch vụ này kết nối bằng cách đăng nhập tài khoản")
  }

  const profile = await deps.loadProfile(ctx)
  const existing = await deps.connections.list(ctx)
  const governance = await loadGovernanceView(ctx.organizationId, deps)
  const availability = availabilityOf(manifest, {
    tier: profile.tier,
    planFeatures: profile.planFeatures,
    connectedKeys: new Set(existing.map((c) => c.connectorKey)),
    isProduction: deps.isProduction,
    isRouteLocked: deps.isRouteLocked,
    isRouteOutOfPhase: deps.isRouteOutOfPhase,
    modeOf: governance.modeOf,
  })
  if (availability === "HIDDEN") throw notFound()
  if (availability === "LOCKED_BY_UPPER") throw new AppError("UNPROCESSABLE_ENTITY", "Cấp trên đã khoá tích hợp này", { violation: "LOCKED_BY_UPPER" })
  if (availability === "INHERITED") throw new AppError("UNPROCESSABLE_ENTITY", "Tích hợp này dùng kết nối do cấp trên cấp sẵn", { violation: "INHERIT_ONLY" })
  if (availability === "NEEDS_UPGRADE") throw new AppError("ENTITLEMENT_REQUIRED", "Gói dịch vụ hiện tại chưa có tích hợp này")
  if (!canStartConnect(availability, manifest)) throw new AppError("UNPROCESSABLE_ENTITY", "Không thể kết nối thêm dịch vụ này")

  const connector = connectorFor(manifest.key, deps)
  if (!connector.connectWithSecret) throw new AppError("UNPROCESSABLE_ENTITY", "Dịch vụ này chưa hỗ trợ nhập khoá")
  const secret = input.secret.trim()
  let result
  try {
    result = await connector.connectWithSecret(secret, input.options ?? {})
  } catch {
    throw validationFailed({ secret: "Khoá không hợp lệ hoặc dịch vụ từ chối kết nối" })
  }

  const sealed = sealCredential(manifest.key, secret)
  const record = await deps.connections.create(ctx, {
    connectorKey: manifest.key,
    scopeTier: profile.tier,
    externalAccountId: result.externalAccountId,
    displayName: result.displayName,
    status: "ACTIVE",
    config: result.config,
    credentialEncrypted: sealed.encrypted,
    credentialHint: sealed.hint,
    expiresAt: result.expiresAt ?? null,
  })
  await deps.audit(ctx, {
    action: "integration.connect",
    entityType: AUDIT_ENTITY,
    entityId: record.id,
    after: { connectorKey: manifest.key, externalAccountId: record.externalAccountId },
  })
  return toView(record)
}

export async function disconnectConnection(ctx: TenantContext, id: string, deps: HubDeps = defaultHubDeps()): Promise<void> {
  requireCapability(ctx, "W2")
  const record = await loadOwned(ctx, id, deps)
  const connector = deps.getConnector(record.connectorKey)
  if (connector?.revoke && record.credentialEncrypted) {
    // Thu hồi phía nhà cung cấp là nỗ lực tốt nhất — lỗi ở đó không được giữ bí mật lại trong DB.
    await connector
      .revoke({ secret: openCredential(record.connectorKey, record.credentialEncrypted) })
      .catch(() => undefined)
  }
  await deps.connections.update(ctx, id, { status: "DISCONNECTED", credentialEncrypted: null, credentialHint: null })
  await deps.audit(ctx, {
    action: "integration.disconnect",
    entityType: AUDIT_ENTITY,
    entityId: id,
    before: { connectorKey: record.connectorKey, status: record.status },
  })
}

export async function rotateCredential(
  ctx: TenantContext,
  input: { id: string; secret: string },
  deps: HubDeps = defaultHubDeps()
): Promise<ConnectionView> {
  requireCapability(ctx, "W3")
  const record = await loadOwned(ctx, input.id, deps)
  const connector = connectorFor(record.connectorKey, deps)
  const secret = input.secret.trim()
  const health = await connector.testConnection({ secret }, record.config)
  if (!health.ok) throw validationFailed({ secret: "Khoá mới không dùng được" })
  const sealed = sealCredential(record.connectorKey, secret)
  const updated = await deps.connections.update(ctx, input.id, {
    credentialEncrypted: sealed.encrypted,
    credentialHint: sealed.hint,
    status: "ACTIVE",
    lastErrorCode: null,
    lastHealthAt: deps.now(),
  })
  if (!updated) throw notFound()
  await deps.audit(ctx, { action: "integration.rotate_credential", entityType: AUDIT_ENTITY, entityId: input.id })
  return toView(updated)
}

export async function testConnection(ctx: TenantContext, id: string, deps: HubDeps = defaultHubDeps()): Promise<ConnectionView> {
  requireCapability(ctx, "W3")
  const record = await loadOwned(ctx, id, deps)
  const connector = connectorFor(record.connectorKey, deps)
  if (!record.credentialEncrypted) throw new AppError("UNPROCESSABLE_ENTITY", "Kết nối chưa có khoá")
  const health = await connector
    .testConnection({ secret: openCredential(record.connectorKey, record.credentialEncrypted) }, record.config)
    .catch(() => ({ ok: false, transient: true, errorCode: "UNREACHABLE" }))
  const next = statusAfterHealthCheck(record.status, health)
  const updated = await deps.connections.update(ctx, id, {
    ...(canTransition(record.status, next) ? { status: next } : {}),
    lastHealthAt: deps.now(),
    lastErrorCode: health.ok ? null : (health.errorCode ?? "CHECK_FAILED"),
  })
  if (!updated) throw notFound()
  return toView(updated)
}
