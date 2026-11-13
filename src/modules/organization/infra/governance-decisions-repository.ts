/**
 * Lưu/đọc quyết định ma trận quản trị theo tầng — bảng `governance_decisions` (ADR-012 D-T10), phạm vi `org:<id>`
 * (tổ chức) hoặc `platform` (Mẹ). T-7c đã bỏ nơi lưu cũ (`settings.governance_matrix`, `platform_settings`
 * `governance_matrix:*`). Tầng Chuỗi của một cửa hàng: chuỗi cha chính (`findPrimaryChainLink`).
 */
import { matrixRecords } from "@/core/governance/decision-record"
import { currentDecisions, syncDecisionScope } from "@/core/governance/infra/decision-log"
import { organizationTierOf } from "@/core/governance/tier-of"
import { prisma } from "@/core/tenancy/infra/prisma"

import { findPrimaryChainLink } from "./tier-chain-repository"
import {
  decisionsFromRecords,
  withBuiltInLocks,
  type GovernanceDecisions,
  type GovernanceSystem,
  type PolicyGovernanceUpper,
  type PolicySystem,
  type UpperLayer,
} from "../domain/governance-decisions"

const MOTHER_SCOPE = "platform"
const orgScope = (organizationId: string) => `org:${organizationId}`
const matrixSystem = (system: GovernanceSystem) => `matrix:${system}` as const

async function readMatrix(system: GovernanceSystem, scope: string): Promise<GovernanceDecisions> {
  return decisionsFromRecords(await currentDecisions(prisma, { systems: [matrixSystem(system)], scopes: [scope] }), system)
}

export async function getOrgGovernance(organizationId: string, system: GovernanceSystem): Promise<GovernanceDecisions> {
  return readMatrix(system, orgScope(organizationId))
}

/**
 * Lưu tập ghi đè + khoá của một tổ chức (ADR-012 T-7c: chỉ còn `governance_decisions`). Khoá dòng tổ chức trong giao
 * dịch để hai lần lưu đồng thời của cùng tổ chức chạy lần lượt (trước đây lệnh UPDATE settings giữ khoá này).
 */
export async function saveOrgGovernance(
  organizationId: string,
  system: GovernanceSystem,
  decisions: GovernanceDecisions,
  decidedBy: string | null = null,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ type: string }>>`SELECT "type"::text AS type FROM organizations WHERE id = ${organizationId} FOR UPDATE`
    const org = rows[0]
    if (!org) return false
    const tier = organizationTierOf(org.type)
    const scope = orgScope(organizationId)
    await syncDecisionScope(tx, { system: matrixSystem(system), scope }, matrixRecords({ system, tier, scope, decisions, decidedBy }), decidedBy)
    return true
  })
}

export async function getMotherGovernance(system: GovernanceSystem): Promise<GovernanceDecisions> {
  return readMatrix(system, MOTHER_SCOPE)
}

export async function saveMotherGovernance(system: GovernanceSystem, decisions: GovernanceDecisions, updatedBy: string | null): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Hai lần lưu đồng thời cùng ma trận của Mẹ chạy lần lượt (khoá theo giao dịch)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`governance:${matrixSystem(system)}:${MOTHER_SCOPE}`}))`
    await syncDecisionScope(
      tx,
      { system: matrixSystem(system), scope: MOTHER_SCOPE },
      matrixRecords({ system, tier: "MOTHER", scope: MOTHER_SCOPE, decisions, decidedBy: updatedBy }),
      updatedBy,
    )
  })
}

/** Các tầng trên của tổ chức, thứ tự từ cao xuống: Mẹ, rồi Chuỗi (nếu tổ chức là đối tác của một chuỗi). */
export async function getUpperLayers(organizationId: string, system: GovernanceSystem, includeChain: boolean): Promise<UpperLayer[]> {
  const layers: UpperLayer[] = withBuiltInLocks(system, [{ tier: "MOTHER", decisions: await getMotherGovernance(system) }])
  if (!includeChain) return layers
  const link = await findPrimaryChainLink(organizationId)
  if (link) layers.push({ tier: "CHAIN", decisions: await readMatrix(system, orgScope(link.chainOrgId)) })
  return layers
}

/**
 * Ma trận của nhiều hệ thống cùng lúc (2 truy vấn) cho luồng bán hàng công khai, nơi mỗi lần tải trang/báo giá cần cả
 * Ưu đãi, Cam kết và Chính sách: tầng trên (Mẹ, Chuỗi) và quyết định riêng của tiệm (`own`).
 */
export async function getPolicyGovernanceUpper(organizationId: string, systems: readonly PolicySystem[]): Promise<PolicyGovernanceUpper> {
  const link = await findPrimaryChainLink(organizationId)
  const chainScope = link ? orgScope(link.chainOrgId) : null
  const records = await currentDecisions(prisma, {
    systems: systems.map(matrixSystem),
    scopes: [MOTHER_SCOPE, orgScope(organizationId), ...(chainScope ? [chainScope] : [])],
  })
  const inScope = (scope: string) => records.filter((r) => r.scope === scope)
  const own: Partial<Record<PolicySystem, GovernanceDecisions>> = {}
  const out: PolicyGovernanceUpper = { own }
  for (const system of systems) {
    const layers: UpperLayer[] = withBuiltInLocks(system, [{ tier: "MOTHER", decisions: decisionsFromRecords(inScope(MOTHER_SCOPE), system) }])
    if (chainScope) layers.push({ tier: "CHAIN", decisions: decisionsFromRecords(inScope(chainScope), system) })
    out[system] = layers
    own[system] = decisionsFromRecords(inScope(orgScope(organizationId)), system)
  }
  return out
}
