/**
 * Admin SaaS đổi vòng đời một tổ chức (N2; ADR-016 D-S5, bước S-3a): tạm ngưng, mở lại, chuyển sang rời nền tảng (chỉ
 * xem, kèm hạn giữ dữ liệu theo hợp đồng). `DELETED` không đặt ở đây — chỉ đường xoá tenant (S-3b) đặt.
 * Ghi `platform_audit_logs` (hành động của nền tảng) và `audit_logs` của tổ chức (chủ tổ chức xem được).
 */
import { AppError, notFound } from "@/core/http/errors"
import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { canChangeLifecycle, type SettableLifecycleStatus } from "@/modules/organization/domain/organization-lifecycle"
import { lifecycleStatusOf, setLifecycleStatus } from "@/modules/organization/infra/organization-lifecycle-repository"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"

export async function setOrganizationLifecycle(
  pctx: PlatformContext,
  input: { organizationId: string; status: SettableLifecycleStatus; offboardingUntil?: Date | null; note?: string | null },
  now: Date = new Date(),
): Promise<{ success: true; lifecycleStatus: SettableLifecycleStatus; offboardingUntil: string | null }> {
  requirePlatformCapability(pctx, "N2")
  const before = await lifecycleStatusOf(input.organizationId)
  if (!before) throw notFound()
  if (!canChangeLifecycle(before, input.status)) {
    throw new AppError("CONFLICT", before === "DELETED" ? "Tổ chức đã đóng, không đổi lại được" : "Tổ chức đang ở trạng thái này rồi")
  }
  const offboardingUntil = input.status === "OFFBOARDING" ? (input.offboardingUntil ?? null) : null
  if (input.status === "OFFBOARDING" && (!offboardingUntil || offboardingUntil <= now)) {
    throw new AppError("VALIDATION_FAILED", "Cần hạn giữ dữ liệu (ngày trong tương lai) khi chuyển sang rời nền tảng")
  }
  await setLifecycleStatus(input.organizationId, input.status, offboardingUntil, now)
  const change = {
    before: { lifecycle_status: before },
    after: { lifecycle_status: input.status, offboarding_until: offboardingUntil?.toISOString() ?? null, note: input.note ?? null },
  }
  await recordPlatformAuditLog(pctx, { action: "platform.organization_lifecycle_changed", entityType: "organizations", entityId: input.organizationId, ...change })
  await recordAuditLog(
    { organizationId: input.organizationId, workspaceId: "", userId: pctx.userId, branchId: null, capabilities: new Set(["N2"]) },
    { action: "platform.organization_lifecycle_changed", entityType: "organizations", entityId: input.organizationId, ...change },
  )
  return { success: true, lifecycleStatus: input.status, offboardingUntil: offboardingUntil?.toISOString() ?? null }
}
