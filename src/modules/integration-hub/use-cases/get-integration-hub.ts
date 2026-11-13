/**
 * Trang Trung tâm Tích hợp: tổng quan (L0) + danh mục theo tầng/gói (L1) + kết nối hiện có.
 * Quyền: W1. Không trả bí mật — chỉ `credentialHint`.
 */

import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { availabilityOf, canStartConnect, type ConnectorAvailability } from "../domain/catalog-availability"
import { CONNECTOR_CATALOG } from "../domain/connector-catalog"
import type { ConnectorManifest, ManagedPanelKey } from "../domain/connector-manifest"
import { needsAttention } from "../domain/connection-lifecycle"
import { toView, type ConnectionView } from "../infra/connection-repository"
import { defaultHubDeps, type HubDeps } from "./hub-deps"
import { loadGovernanceView } from "./governance-mode"

export interface CatalogItem {
  readonly key: string
  readonly category: ConnectorManifest["category"]
  readonly label: string
  readonly description: string
  readonly availability: ConnectorAvailability
  readonly canConnect: boolean
  readonly auth: ConnectorManifest["auth"]
  readonly legacyHref: string | null
  readonly panel: ManagedPanelKey | null
}

export interface IntegrationHubView {
  readonly overview: { active: number; needsAttention: number; failedEvents24h: number }
  readonly catalog: CatalogItem[]
  readonly connections: ConnectionView[]
  /** Tích hợp chạy bằng phân hệ sẵn có đang bật (quản lý qua panel nhúng). */
  readonly managedConnected: string[]
  /** Dòng theo dõi webhook của tích hợp MANAGED, theo khoá đầu nối — để xem nhật ký. */
  readonly managedLogs: ConnectionView[]
  /** Kết nối cấp trên (chuỗi) mà tổ chức đang dùng nhờ — chỉ tên, không có khoá. */
  readonly inherited: Array<{ connectorKey: string; displayName: string }>
}

export async function getIntegrationHub(ctx: TenantContext, deps: HubDeps = defaultHubDeps()): Promise<IntegrationHubView> {
  requireCapability(ctx, "W1")
  const [profile, records, managedConnected, governance] = await Promise.all([
    deps.loadProfile(ctx),
    deps.connections.list(ctx),
    deps.loadManagedConnected(ctx, deps.now()),
    loadGovernanceView(ctx.organizationId, deps),
  ])
  const since = new Date(deps.now().getTime() - 24 * 3_600_000)
  const [failed, dead] = await Promise.all([
    deps.events.countByStatusSince(ctx, "FAILED", since),
    deps.events.countByStatusSince(ctx, "DEAD", since),
  ])
  const connectedKeys = new Set([...records.map((r) => r.connectorKey), ...managedConnected])
  const input = { tier: profile.tier, planFeatures: profile.planFeatures, connectedKeys, isProduction: deps.isProduction, isRouteLocked: deps.isRouteLocked, isRouteOutOfPhase: deps.isRouteOutOfPhase, modeOf: governance.modeOf }

  const catalog = CONNECTOR_CATALOG.map((m) => ({ manifest: m, availability: availabilityOf(m, input) }))
    .filter(({ availability }) => availability !== "HIDDEN")
    .map(({ manifest, availability }) => ({
      key: manifest.key,
      category: manifest.category,
      label: manifest.label,
      description: manifest.description,
      availability,
      canConnect: canStartConnect(availability, manifest) && deps.getConnector(manifest.key) !== null,
      auth: manifest.auth,
      legacyHref: availability === "COMING_SOON" ? null : (manifest.legacyHref ?? null),
      panel: availability === "COMING_SOON" ? null : (manifest.panel ?? null),
    }))
  const chainId = governance.scope.parentChainOrgId
  const inherited: Array<{ connectorKey: string; displayName: string }> = []
  if (chainId) {
    for (const item of catalog.filter((c) => c.availability === "INHERITED")) {
      const conn = await deps.governance.chainConnection(chainId, item.key)
      if (conn) inherited.push({ connectorKey: item.key, displayName: conn.displayName })
    }
  }
  const visibleManaged = catalog.filter((c) => c.panel && c.availability === "CONNECTED").map((c) => c.key)

  return {
    overview: {
      active: records.filter((r) => !r.managed && r.status === "ACTIVE").length + visibleManaged.length,
      needsAttention: records.filter((r) => needsAttention(r.status)).length,
      failedEvents24h: failed + dead,
    },
    catalog,
    connections: records.filter((r) => !r.managed).map(toView),
    managedLogs: records.filter((r) => r.managed).map(toView),
    inherited,
    managedConnected: visibleManaged,
  }
}
