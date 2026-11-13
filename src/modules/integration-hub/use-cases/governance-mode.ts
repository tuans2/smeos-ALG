/**
 * Chế độ khoá hiệu lực cho một tổ chức — dùng chung cho danh mục, kết nối mới, cổng webhook và webhook
 * Facebook/Zalo. `organizationId` luôn đến từ phiên hoặc từ kết nối đã xác thực chữ ký, không từ client.
 */

import { effectiveMode, upperScopesOf, type GovernanceMode, type OrgGovernanceScope } from "../domain/integration-governance"
import { getGovernanceRepository } from "../infra/governance-repository"
import type { HubDeps } from "./hub-deps"

export interface GovernanceView {
  readonly scope: OrgGovernanceScope
  readonly modeOf: (connectorKey: string) => GovernanceMode
}

export async function loadGovernanceView(organizationId: string, deps: Pick<HubDeps, "governance">): Promise<GovernanceView> {
  const scope = await deps.governance.scopeOf(organizationId)
  const rows = await deps.governance.listForScopes(upperScopesOf(scope).map((s) => s.scopeId))
  return { scope, modeOf: (key) => effectiveMode(key, scope, rows).value }
}

/** Tổ chức có được dùng kết nối RIÊNG của mình với đầu nối này không (chỉ ALLOW_OWN). */
export async function isOwnConnectionAllowed(
  organizationId: string,
  connectorKey: string,
  deps: Pick<HubDeps, "governance"> = { governance: getGovernanceRepository() }
): Promise<boolean> {
  return (await loadGovernanceView(organizationId, deps)).modeOf(connectorKey) === "ALLOW_OWN"
}
