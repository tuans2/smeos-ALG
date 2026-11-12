/**
 * Admin SaaS đổi mức cô lập của một tổ chức (N2; ADR-016 D-S2, bước S-5). Gói thuê bao đang hiệu lực quyết định mức
 * được phép (`isolation-tier.ts`) — không cho phép → 422. Ghi `platform_audit_logs` và `audit_logs` của tổ chức.
 * Chỉ ghi nhận mức; dựng triển khai riêng (`DEDICATED`) là việc vận hành S-6.
 */
import { AppError, notFound } from "@/core/http/errors"
import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { allowedIsolationTiers, ISOLATION_TIER_LABEL, type IsolationTier } from "@/modules/organization/domain/isolation-tier"
import { isolationTierOf, setIsolationTier } from "@/modules/organization/infra/organization-lifecycle-repository"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { effectivePlanOf } from "@/modules/subscription/infra/subscription-repository"

export async function setOrganizationIsolationTier(
  pctx: PlatformContext,
  input: { organizationId: string; tier: IsolationTier; note?: string | null },
): Promise<{ success: true; isolationTier: IsolationTier }> {
  requirePlatformCapability(pctx, "N2")
  const before = await isolationTierOf(input.organizationId)
  if (!before) throw notFound()
  if (before === input.tier) throw new AppError("CONFLICT", "Tổ chức đang ở mức này rồi")
  const plan = await effectivePlanOf(input.organizationId)
  if (!allowedIsolationTiers(plan).includes(input.tier)) {
    throw new AppError("UNPROCESSABLE_ENTITY", `Gói hiện tại không cho phép mức "${ISOLATION_TIER_LABEL[input.tier]}"`)
  }
  await setIsolationTier(input.organizationId, input.tier)
  const change = { before: { isolation_tier: before }, after: { isolation_tier: input.tier, plan, note: input.note ?? null } }
  await recordPlatformAuditLog(pctx, { action: "platform.organization_isolation_changed", entityType: "organizations", entityId: input.organizationId, ...change })
  await recordAuditLog(
    { organizationId: input.organizationId, workspaceId: "", userId: pctx.userId, branchId: null, capabilities: new Set(["N2"]) },
    { action: "platform.organization_isolation_changed", entityType: "organizations", entityId: input.organizationId, ...change },
  )
  return { success: true, isolationTier: input.tier }
}
