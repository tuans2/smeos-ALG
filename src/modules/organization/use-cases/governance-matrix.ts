/**
 * Đọc/lưu quyết định ma trận quản trị của tổ chức đang đăng nhập, kèm khoá của các tầng trên.
 * `organizationId` luôn từ `TenantContext`.
 */
import { organizationTierOf } from "@/core/governance/tier-of"
import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import {
  parseDecisions,
  validateDecisions,
  type GovernanceDecisions,
  type GovernanceLayerTier,
  type GovernanceSystem,
  type PolicyGovernanceUpper,
  type UpperLayer,
  POLICY_SYSTEMS,
} from "../domain/governance-decisions"
import { getOrgGovernance, getPolicyGovernanceUpper, getUpperLayers, saveOrgGovernance } from "../infra/governance-decisions-repository"
import { OrganizationRepository } from "../infra/organization-repository"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"

/** Tầng dữ liệu của tổ chức — luật ở `core/governance/tier-of.ts`. */
export function governanceTierOf(organizationType: string | null | undefined): GovernanceLayerTier {
  return organizationTierOf(organizationType)
}

export type GovernanceMatrixView = {
  system: GovernanceSystem
  tier: GovernanceLayerTier
  own: GovernanceDecisions
  upper: UpperLayer[]
}

async function tierFor(ctx: TenantContext): Promise<GovernanceLayerTier> {
  const org = await new OrganizationRepository().findById(ctx.organizationId)
  if (!org) throw new AppError("NOT_FOUND", "Không tìm thấy tổ chức")
  return governanceTierOf(org.type)
}

export async function getGovernanceMatrix(ctx: TenantContext, system: GovernanceSystem): Promise<GovernanceMatrixView> {
  const tier = await tierFor(ctx)
  const [own, upper] = await Promise.all([
    getOrgGovernance(ctx.organizationId, system),
    getUpperLayers(ctx.organizationId, system, tier === "STORE"),
  ])
  return { system, tier, own, upper }
}

export async function saveGovernanceMatrix(ctx: TenantContext, system: GovernanceSystem, raw: unknown): Promise<GovernanceMatrixView> {
  const tier = await tierFor(ctx)
  const next = parseDecisions(raw)
  const upper = await getUpperLayers(ctx.organizationId, system, tier === "STORE")
  const violations = validateDecisions(next, tier, upper)
  if (violations.length > 0) {
    throw new AppError("UNPROCESSABLE_ENTITY", "Có mục đã bị cấp trên khoá hoặc không được phép khoá ở cấp này", { violations })
  }
  const before = await getOrgGovernance(ctx.organizationId, system)
  const saved = await saveOrgGovernance(ctx.organizationId, system, next, ctx.userId)
  if (!saved) throw new AppError("NOT_FOUND", "Không tìm thấy tổ chức")
  await recordAuditLog(ctx, {
    action: "organization.governance_matrix.update",
    entityType: "organizations",
    entityId: ctx.organizationId,
    before: { system, ...before },
    after: { system, ...next },
  })
  return { system, tier, own: next, upper }
}

/**
 * Khoá tầng trên của Ưu đãi / Cam kết / Chính sách cho luồng bán hàng công khai. Lỗi đọc → coi như
 * không có khoá tầng trên (quyết định của chính tiệm vẫn áp), không làm hỏng trang khách.
 */
export async function loadPolicyGovernance(organizationId: string): Promise<PolicyGovernanceUpper> {
  try {
    return await getPolicyGovernanceUpper(organizationId, POLICY_SYSTEMS)
  } catch {
    return {}
  }
}
