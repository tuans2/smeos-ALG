/**
 * Khoá tích hợp theo tầng — lưu ở `governance_decisions` (ADR-012 D-T10; T-7c bỏ bảng `integration_governance`).
 * Phạm vi tầng Chuỗi là id tổ chức chuỗi, chỉ ghi được từ phiên của chính chuỗi đó. Phạm vi lưu theo địa chỉ D-T5
 * (`platform`, `industry:<key>`, `org:<id>`) — đổi qua lại với dạng domain ("GLOBAL", id tổ chức) ngay ở đây.
 */

import { integrationRecord } from "@/core/governance/decision-record"
import { currentDecisions, recordDecisions } from "@/core/governance/infra/decision-log"
import { fromScopeKey, toScopeKey } from "@/core/governance/scope-key"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { GovernanceTier } from "@/core/governance/layered-resolver"
import { ACTIVE_CHAIN_LINK } from "@/modules/organization/infra/organization-links"
import { resolveTierChain } from "@/modules/organization/infra/tier-chain-repository"
import type { GovernanceMode, GovernanceRow, OrgGovernanceScope } from "../domain/integration-governance"

export class GovernanceRepository {
  async listForScopes(scopeIds: readonly string[]): Promise<GovernanceRow[]> {
    if (scopeIds.length === 0) return []
    const records = await currentDecisions(prisma, { systems: ["integration"], scopes: [...new Set(scopeIds.map(toScopeKey))] })
    return records.flatMap((r) => {
      const mode = r.value?.["mode"]
      if (mode !== "FORBID" && mode !== "INHERIT_ONLY") return []
      return [{ connectorKey: r.decisionKey, tier: r.tier as GovernanceTier, scopeId: fromScopeKey(r.scope), mode }]
    })
  }

  /** Một dòng `governance_decisions`; `ALLOW_OWN` là mặc định nên thành dòng gỡ (ADR-012 T-7c). */
  async set(input: { connectorKey: string; tier: GovernanceTier; scopeId: string; mode: GovernanceMode; updatedBy: string }) {
    await recordDecisions(prisma, [integrationRecord({ ...input, decidedBy: input.updatedBy })])
  }

  /** Ngành (`organizations.industry_key`) và chuỗi đang liên kết ACTIVE của một tổ chức. */
  async scopeOf(organizationId: string): Promise<OrgGovernanceScope> {
    const chain = await resolveTierChain(organizationId)
    return { industryKey: chain?.industryKey ?? null, parentChainOrgId: chain?.primaryChain?.organizationId ?? null }
  }

  /** Cửa hàng đối tác ACTIVE của một chuỗi — để báo khi chuỗi đổi khoá. */
  async partnerOrgIds(chainOrgId: string): Promise<string[]> {
    const rows = await prisma.organization_links.findMany({
      where: { parent_org_id: chainOrgId, ...ACTIVE_CHAIN_LINK },
      select: { child_org_id: true },
      take: 500,
    })
    return rows.map((r) => r.child_org_id)
  }

  /** Kết nối đang dùng được của chuỗi cho một đầu nối — cửa hàng kế thừa (chỉ dùng, không đọc khoá). */
  async chainConnection(chainOrgId: string, connectorKey: string): Promise<{ id: string; displayName: string } | null> {
    const row = await prisma.integration_connections.findFirst({
      where: { organization_id: chainOrgId, connector_key: connectorKey, status: { in: ["ACTIVE", "DEGRADED"] } },
      orderBy: { created_at: "asc" },
      select: { id: true, display_name: true },
    })
    return row ? { id: row.id, displayName: row.display_name } : null
  }
}

let _repo: GovernanceRepository | null = null
export function getGovernanceRepository(): GovernanceRepository {
  if (!_repo) _repo = new GovernanceRepository()
  return _repo
}
