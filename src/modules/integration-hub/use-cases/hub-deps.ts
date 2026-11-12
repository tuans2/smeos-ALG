/** Phụ thuộc chung của use-case Trung tâm Tích hợp — tiêm được để test không cần DB. */

import { isHrefInPhase } from "@/lib/delivery/delivery-phase"
import { isRouteLocked } from "@/lib/feature-lock"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { getConnector } from "../adapters/connectors"
import { getConnectionRepository, type ConnectionRepository } from "../infra/connection-repository"
import { getEventRepository, type EventRepository } from "../infra/event-repository"
import { loadOrgProfile } from "../infra/org-profile"
import { loadManagedConnectedKeys } from "../infra/legacy-connection-status"
import { getGovernanceRepository, type GovernanceRepository } from "../infra/governance-repository"

export interface HubDeps {
  connections: Pick<ConnectionRepository, keyof ConnectionRepository>
  events: Pick<EventRepository, keyof EventRepository>
  loadProfile: typeof loadOrgProfile
  loadManagedConnected: typeof loadManagedConnectedKeys
  governance: Pick<GovernanceRepository, keyof GovernanceRepository>
  getConnector: typeof getConnector
  audit: typeof recordAuditLog
  notify: typeof notifyOrganization
  isProduction: boolean
  isRouteLocked: (href: string) => boolean
  isRouteOutOfPhase: (href: string) => boolean
  now: () => Date
}

export function defaultHubDeps(): HubDeps {
  return {
    connections: getConnectionRepository(),
    events: getEventRepository(),
    loadProfile: loadOrgProfile,
    loadManagedConnected: loadManagedConnectedKeys,
    governance: getGovernanceRepository(),
    getConnector,
    audit: recordAuditLog,
    notify: notifyOrganization,
    isProduction: process.env.NODE_ENV === "production",
    isRouteLocked: (href) => isRouteLocked(href),
    isRouteOutOfPhase: (href) => !isHrefInPhase(href),
    now: () => new Date(),
  }
}
