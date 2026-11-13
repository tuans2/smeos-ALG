/**
 * Admin nền tảng bật / tắt phạm vi chi nhánh đợt 1 cho một tổ chức (N2; ADR-012 T-5, quyết định D-59).
 * Bật sau khi đã báo khách: nhân viên bị giới hạn theo chi nhánh chỉ còn thấy khách của chi nhánh mình và khách dùng
 * chung. Ghi `organizations.settings.branch_scope.wave1` và nhật ký kiểm toán.
 */
import { notFound } from "@/core/http/errors"
import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { BRANCH_SCOPE_SETTING_KEY, isBranchScopeWaveEnabled } from "@/core/tenancy/branch-scope-rollout"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"

export async function setBranchScopeWave1(
  pctx: PlatformContext,
  input: { organizationId: string; enabled: boolean },
): Promise<{ success: true; branchScopeWave1: boolean }> {
  requirePlatformCapability(pctx, "N2")
  const orgRepo = getOrganizationRepository()
  const org = await orgRepo.findById(input.organizationId)
  if (!org) throw notFound()
  const settings = org.settings && typeof org.settings === "object" ? (org.settings as Record<string, unknown>) : {}
  const before = isBranchScopeWaveEnabled(settings, "wave1")
  const current = settings[BRANCH_SCOPE_SETTING_KEY]
  const scope = current && typeof current === "object" && !Array.isArray(current) ? (current as Record<string, unknown>) : {}
  await orgRepo.updateTypeAndSettings(org.id, org.type, { ...settings, [BRANCH_SCOPE_SETTING_KEY]: { ...scope, wave1: input.enabled } })
  await recordAuditLog(
    { organizationId: org.id, workspaceId: "", userId: pctx.userId, branchId: null, capabilities: new Set(["N2"]) },
    {
      action: "platform.branch_scope_wave_changed",
      entityType: "organizations",
      entityId: org.id,
      before: { wave1: before },
      after: { wave1: input.enabled },
    },
  )
  return { success: true, branchScopeWave1: input.enabled }
}
