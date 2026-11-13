/**
 * Khoá / cấp sẵn tích hợp theo tầng (GĐ3).
 * - Chuỗi (W4) đặt chế độ cho cửa hàng đối tác — phạm vi là CHÍNH tổ chức của phiên.
 * - Nền tảng (N16) đặt cho toàn nền tảng ("GLOBAL") hoặc một ngành ("industry:<key>").
 * Vi phạm → 422 kèm `violation`; mọi thay đổi ghi nhật ký.
 */

import { requireCapability } from "@/core/rbac/capabilities"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import type { PlatformContext } from "@/core/platform/platform-context"
import { AppError, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { GovernanceTier } from "@/core/governance/layered-resolver"
import { CONNECTOR_CATALOG, findManifest } from "../domain/connector-catalog"
import {
  GLOBAL_SCOPE,
  effectiveMode,
  upperScopesOf,
  validateGovernanceChange,
  type GovernanceMode,
  type GovernanceRow,
  type OrgGovernanceScope,
} from "../domain/integration-governance"
import { defaultGovernanceDeps, type GovernanceDeps } from "./governance-deps"

export interface GovernanceItem {
  readonly connectorKey: string
  readonly label: string
  /** Chế độ tầng này đang đặt cho tầng dưới. */
  readonly mode: GovernanceMode
  /** Tầng trên đã khoá → tầng này không đổi được. */
  readonly lockedByUpper: GovernanceTier | null
  readonly upperMode: GovernanceMode
}

const governable = () => CONNECTOR_CATALOG.filter((m) => m.governable && !m.devOnly)

function itemsFor(scope: OrgGovernanceScope, tier: GovernanceTier, scopeId: string, rows: readonly GovernanceRow[]): GovernanceItem[] {
  return governable().map((m) => {
    const own = rows.find((r) => r.connectorKey === m.key && r.tier === tier && r.scopeId === scopeId)
    const upper = effectiveMode(m.key, scope, rows)
    return { connectorKey: m.key, label: m.label, mode: own?.mode ?? "ALLOW_OWN", lockedByUpper: upper.lockedBy, upperMode: upper.value }
  })
}

function rejectViolation(violation: string): never {
  const message =
    violation === "LOCKED_BY_UPPER" ? "Cấp trên đã khoá tích hợp này" : violation === "NOT_GOVERNABLE" ? "Tích hợp này chưa hỗ trợ khoá theo tầng" : "Cửa hàng không khoá được tích hợp"
  throw new AppError("UNPROCESSABLE_ENTITY", message, { violation })
}

// ─── Chuỗi ──────────────────────────────────────────────────────────────────

export async function getChainGovernance(ctx: TenantContext, deps: GovernanceDeps = defaultGovernanceDeps()): Promise<GovernanceItem[]> {
  requireCapability(ctx, "W4")
  if ((await deps.loadProfile(ctx)).tier !== "CHAIN") throw notFound()
  const scope = await deps.governance.scopeOf(ctx.organizationId)
  const rows = await deps.governance.listForScopes([...upperScopesOf(scope).map((s) => s.scopeId), ctx.organizationId])
  return itemsFor(scope, "CHAIN", ctx.organizationId, rows)
}

export async function setChainGovernance(
  ctx: TenantContext,
  input: { connectorKey: string; mode: GovernanceMode },
  deps: GovernanceDeps = defaultGovernanceDeps()
): Promise<void> {
  requireCapability(ctx, "W4")
  const profile = await deps.loadProfile(ctx)
  const manifest = findManifest(input.connectorKey)
  if (!manifest) throw notFound()
  const scope = await deps.governance.scopeOf(ctx.organizationId)
  const rows = await deps.governance.listForScopes(upperScopesOf(scope).map((s) => s.scopeId))
  const violation = validateGovernanceChange({
    editorTier: profile.tier,
    editorScope: scope,
    connectorKey: manifest.key,
    governable: manifest.governable === true,
    rows,
  })
  if (violation) rejectViolation(violation)
  await deps.governance.set({ connectorKey: manifest.key, tier: "CHAIN", scopeId: ctx.organizationId, mode: input.mode, updatedBy: ctx.userId })
  await deps.audit(ctx, { action: "integration.governance.set", entityType: "integration_governance", entityId: manifest.key, after: { mode: input.mode } })
  if (input.mode !== "ALLOW_OWN") {
    for (const partnerId of await deps.governance.partnerOrgIds(ctx.organizationId)) {
      await deps.notify({ organizationId: partnerId, eventKey: "INTEGRATION_CONNECTION_DEGRADED" })
    }
  }
}

// ─── Nền tảng (Mẹ + Ngành) ─────────────────────────────────────────────────

function platformScope(scopeId: string): { tier: GovernanceTier; scope: OrgGovernanceScope } {
  if (scopeId === GLOBAL_SCOPE) return { tier: "MOTHER", scope: { industryKey: null, parentChainOrgId: null } }
  const match = /^industry:([A-Za-z0-9_-]{1,40})$/.exec(scopeId)
  if (!match) throw new AppError("VALIDATION_FAILED", "Phạm vi không hợp lệ")
  return { tier: "INDUSTRY", scope: { industryKey: match[1] ?? null, parentChainOrgId: null } }
}

export async function getPlatformGovernance(pctx: PlatformContext, scopeId: string, deps: GovernanceDeps = defaultGovernanceDeps()): Promise<GovernanceItem[]> {
  requirePlatformCapability(pctx, "N16")
  const { tier, scope } = platformScope(scopeId)
  const rows = await deps.governance.listForScopes([GLOBAL_SCOPE, scopeId])
  // Mẹ không có tầng trên: khoá của chính nó không được tính là "khoá tầng trên".
  const upperRows = tier === "MOTHER" ? [] : rows.filter((r) => r.tier === "MOTHER")
  return itemsFor(scope, tier, scopeId, [...upperRows, ...rows.filter((r) => r.scopeId === scopeId && r.tier === tier)]).map((item) =>
    tier === "MOTHER" ? { ...item, lockedByUpper: null, upperMode: "ALLOW_OWN" as GovernanceMode } : item
  )
}

export async function setPlatformGovernance(
  pctx: PlatformContext,
  input: { scopeId: string; connectorKey: string; mode: GovernanceMode },
  deps: GovernanceDeps = defaultGovernanceDeps()
): Promise<void> {
  requirePlatformCapability(pctx, "N16")
  const { tier, scope } = platformScope(input.scopeId)
  const manifest = findManifest(input.connectorKey)
  if (!manifest) throw notFound()
  const rows = tier === "MOTHER" ? [] : (await deps.governance.listForScopes([GLOBAL_SCOPE])).filter((r) => r.tier === "MOTHER")
  const violation = validateGovernanceChange({ editorTier: tier, editorScope: scope, connectorKey: manifest.key, governable: manifest.governable === true, rows })
  if (violation) rejectViolation(violation)
  await deps.governance.set({ connectorKey: manifest.key, tier, scopeId: input.scopeId, mode: input.mode, updatedBy: pctx.userId })
  await deps.platformAudit(pctx, {
    action: "integration.governance.set",
    entityType: "integration_governance",
    entityId: `${input.scopeId}:${manifest.key}`,
    after: { mode: input.mode },
  })
}
