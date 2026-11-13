/** Phụ thuộc của use-case governance tích hợp — tiêm được để test không cần DB. */

import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { getGovernanceRepository, type GovernanceRepository } from "../infra/governance-repository"
import { loadOrgProfile } from "../infra/org-profile"

export interface GovernanceDeps {
  governance: Pick<GovernanceRepository, keyof GovernanceRepository>
  loadProfile: typeof loadOrgProfile
  audit: typeof recordAuditLog
  platformAudit: typeof recordPlatformAuditLog
  notify: typeof notifyOrganization
}

export function defaultGovernanceDeps(): GovernanceDeps {
  return {
    governance: getGovernanceRepository(),
    loadProfile: loadOrgProfile,
    audit: recordAuditLog,
    platformAudit: recordPlatformAuditLog,
    notify: notifyOrganization,
  }
}
