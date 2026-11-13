import { afterEach, describe, expect, it, vi } from "vitest"

import type { PlatformContext } from "@/core/platform/platform-context"
import * as auditModule from "@/modules/audit/use-cases/record-audit-log"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { setBranchScopeWave1 } from "@/modules/platform/use-cases/set-branch-scope-wave"

/** D-59 (ADR-012 T-5): Admin SaaS (N2) bật/tắt phạm vi chi nhánh đợt 1, giữ các khoá settings khác, ghi kiểm toán. */
describe("setBranchScopeWave1", () => {
  afterEach(() => vi.restoreAllMocks())
  const org = {
    id: "org-1", name: "Tiệm", slug: "tiem", type: "CHAIN" as const, credit_balance: 0, credit_plan: null,
    settings: { industry: "FLORAL", branch_scope: { other: 1 } }, data_region: "vn", created_at: new Date(), updated_at: new Date(),
  }

  it("bật: ghi branch_scope.wave1 = true, giữ khoá khác, ghi nhật ký", async () => {
    const audit = vi.spyOn(auditModule, "recordAuditLog").mockResolvedValue(undefined as never)
    vi.spyOn(OrganizationRepository.prototype, "findById").mockResolvedValue(org)
    const save = vi.spyOn(OrganizationRepository.prototype, "updateTypeAndSettings").mockResolvedValue({} as never)
    const res = await setBranchScopeWave1({ userId: "admin", capabilities: new Set(["N2"]) } as PlatformContext, { organizationId: "org-1", enabled: true })
    expect(res).toEqual({ success: true, branchScopeWave1: true })
    expect(save).toHaveBeenCalledWith("org-1", "CHAIN", { industry: "FLORAL", branch_scope: { other: 1, wave1: true } })
    expect(audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "platform.branch_scope_wave_changed", before: { wave1: false }, after: { wave1: true } }))
  })

  it("thiếu N2 → bị chặn", async () => {
    await expect(setBranchScopeWave1({ userId: "x", capabilities: new Set(["N1"]) } as PlatformContext, { organizationId: "org-1", enabled: true })).rejects.toThrow()
  })
})
