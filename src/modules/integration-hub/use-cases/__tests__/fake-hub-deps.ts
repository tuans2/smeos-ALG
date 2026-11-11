/** Bộ phụ thuộc giả trong bộ nhớ cho test use-case Trung tâm Tích hợp. */

import { vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { getConnector } from "../../adapters/connectors"
import type { ConnectionRecord, CreateConnectionInput } from "../../infra/connection-repository"
import type { ClaimedEvent, EventStatus } from "../../infra/event-repository"
import type { HubDeps } from "../hub-deps"
import type { GovernanceRow, OrgGovernanceScope } from "../../domain/integration-governance"

export const NOW = new Date("2026-10-30T10:00:00Z")

export function ctxOf(orgId: string, caps: string[] = ["W1", "W2", "W3", "W5"]): TenantContext {
  return { organizationId: orgId, workspaceId: "w", userId: "u", branchId: null, capabilities: new Set(caps) }
}

/** Governance giả: dòng khoá + phạm vi theo tổ chức + kết nối của chuỗi. */
export function makeFakeGovernance() {
  const rows: GovernanceRow[] = []
  const scopes = new Map<string, OrgGovernanceScope>()
  const partners = new Map<string, string[]>()
  const chainConnections = new Map<string, { id: string; displayName: string }>()
  const repo: HubDeps["governance"] = {
    listForScopes: async (ids) => rows.filter((r) => ids.includes(r.scopeId)),
    set: async (input) => {
      const i = rows.findIndex((r) => r.connectorKey === input.connectorKey && r.tier === input.tier && r.scopeId === input.scopeId)
      if (i >= 0) rows.splice(i, 1)
      if (input.mode !== "ALLOW_OWN") rows.push({ connectorKey: input.connectorKey, tier: input.tier, scopeId: input.scopeId, mode: input.mode })
    },
    scopeOf: async (orgId) => scopes.get(orgId) ?? { industryKey: null, parentChainOrgId: null },
    partnerOrgIds: async (chainId) => partners.get(chainId) ?? [],
    chainConnection: async (chainId, key) => chainConnections.get(`${chainId}|${key}`) ?? null,
  }
  return { repo, rows, scopes, partners, chainConnections }
}

export function makeFakeDeps(
  planFeatures: string[] = [],
  managed: string[] = [],
  lockedRoutes: string[] = [],
  governance = makeFakeGovernance()
) {
  const connections: ConnectionRecord[] = []
  const events: ClaimedEvent[] = []
  let seq = 0
  const own = (ctx: TenantContext, id: string) =>
    connections.find((c) => c.id === id && c.organizationId === ctx.organizationId) ?? null

  const deps: HubDeps = {
    connections: {
      list: async (ctx) => connections.filter((c) => c.organizationId === ctx.organizationId && c.status !== "DISCONNECTED"),
      get: async (ctx, id) => own(ctx, id),
      create: async (ctx, input: CreateConnectionInput) => {
        const record: ConnectionRecord = {
          id: `c${++seq}`,
          organizationId: ctx.organizationId,
          connectorKey: input.connectorKey,
          externalAccountId: input.externalAccountId,
          displayName: input.displayName,
          status: input.status,
          config: input.config,
          credentialHint: input.credentialHint,
          credentialEncrypted: input.credentialEncrypted,
          connectionRef: `ref${seq}`,
          expiresAt: null,
          lastHealthAt: null,
          lastErrorCode: null,
          createdAt: NOW.toISOString(),
          managed: false,
        }
        connections.push(record)
        return record
      },
      ensureManaged: async (input) => {
        const found = connections.find(
          (c) => c.organizationId === input.organizationId && c.connectorKey === input.connectorKey && c.externalAccountId === input.externalAccountId
        )
        if (found) return found
        const record: ConnectionRecord = {
          id: `c${++seq}`,
          organizationId: input.organizationId,
          connectorKey: input.connectorKey,
          externalAccountId: input.externalAccountId,
          displayName: input.displayName,
          status: "ACTIVE",
          config: { source: "managed" },
          credentialHint: null,
          credentialEncrypted: null,
          connectionRef: `ref${seq}`,
          expiresAt: null,
          lastHealthAt: null,
          lastErrorCode: null,
          createdAt: NOW.toISOString(),
          managed: true,
        }
        connections.push(record)
        return record
      },
      update: async (ctx, id, patch) => {
        const found = own(ctx, id)
        if (!found) return null
        Object.assign(found, patch)
        return found
      },
      findByRef: async (key, ref) => connections.find((c) => c.connectionRef === ref && c.connectorKey === key) ?? null,
      findByIdSystem: async (id) => connections.find((c) => c.id === id) ?? null,
      listForHealthCheck: async (_limit, before) =>
        connections.filter((c) => c.status !== "DISCONNECTED" && (!c.lastHealthAt || new Date(c.lastHealthAt) < before)),
      setHealthSystem: async (id, status, errorCode, at) => {
        const found = connections.find((c) => c.id === id)
        if (found) Object.assign(found, { status, lastErrorCode: errorCode, lastHealthAt: at.toISOString() })
      },
    },
    events: {
      recordInbound: async (input) => {
        if (input.externalEventId && events.some((e) => e.connectionId === input.connectionId && e.payload && (e as ClaimedEvent & { ext?: string }).ext === input.externalEventId)) {
          return { id: null, duplicate: true }
        }
        const event = {
          id: `e${++seq}`,
          organizationId: input.organizationId,
          connectionId: input.connectionId,
          direction: "IN" as const,
          eventType: input.eventType,
          status: "PENDING" as EventStatus,
          attempts: 0,
          nextRetryAt: null,
          errorCode: null,
          payload: input.payloadRedacted,
          ...(input.finalStatus ? { status: input.finalStatus as EventStatus, attempts: 1 } : {}),
          createdAt: NOW.toISOString(),
          ext: input.externalEventId ?? undefined,
        }
        events.push(event)
        return { id: event.id, duplicate: false }
      },
      connectionIdOf: async (ctx, id) => events.find((e) => e.id === id && e.organizationId === ctx.organizationId)?.connectionId ?? null,
      list: async (ctx, connectionId) => events.filter((e) => e.organizationId === ctx.organizationId && e.connectionId === connectionId),
      countByStatusSince: async (ctx, status) => events.filter((e) => e.organizationId === ctx.organizationId && e.status === status).length,
      listDue: async () => events.filter((e) => e.status === "PENDING" || e.status === "FAILED"),
      claim: async (event) => {
        const found = events.find((e) => e.id === event.id)!
        if (found.attempts !== event.attempts) return false
        Object.assign(found, { attempts: found.attempts + 1 })
        return true
      },
      finish: async (id, outcome) => {
        Object.assign(events.find((e) => e.id === id)!, { status: outcome.status, errorCode: outcome.errorCode ?? null })
      },
      resetForReplay: async (ctx, id) => {
        const found = events.find((e) => e.id === id && e.organizationId === ctx.organizationId)
        if (!found || (found.status !== "FAILED" && found.status !== "DEAD")) return false
        Object.assign(found, { status: "PENDING", attempts: 0 })
        return true
      },
    },
    loadProfile: async () => ({ tier: "STORE", planFeatures: new Set(planFeatures) }),
    loadManagedConnected: async () => new Set(managed),
    governance: governance.repo,
    getConnector,
    audit: vi.fn(async () => ({}) as never),
    notify: vi.fn(async () => 1),
    isProduction: false,
    isRouteLocked: (href) => lockedRoutes.includes(href),
    isRouteOutOfPhase: () => false,
    now: () => NOW,
  }
  return { deps, connections, events }
}
