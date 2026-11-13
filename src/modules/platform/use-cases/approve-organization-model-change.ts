import { notFound, validationFailed } from "@/core/http/errors"
import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import type { organization_type } from "@/modules/organization/infra/entities"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"

export type ApproveModelChangeInput = {
  organizationId: string
  targetType: "SINGLE" | "STORE" | "CHAIN"
  note?: string | null
}

/**
 * Admin SaaS phê duyệt chuyển đổi mô hình (1 Cửa hàng ↔ Chuỗi) cho một tổ chức (`N2`, P25a).
 *
 * Chỉ người vận hành nền tảng có năng lực `N2` mới có quyền thực thi.
 * Khi phê duyệt:
 * - Cập nhật `organizations.type` thành loại mục tiêu.
 * - Cập nhật `require_coordinator_acceptance` trong `brochure_workflow_policy`:
 *   * `true` với Chuỗi (`CHAIN`; `FLOWER_NETWORK` đã gộp vào — D-55, ADR-012 T-8b).
 *   * `false` với 1 Cửa hàng (SINGLE / STORE).
 * - Xóa cờ `pending_model_change` trong `settings`.
 * - Ghi nhận nhật ký kiểm toán nền tảng.
 */
export async function approveOrganizationModelChange(
  pctx: PlatformContext,
  input: ApproveModelChangeInput
): Promise<{ success: true; targetType: organization_type; organizationId: string }> {
  requirePlatformCapability(pctx, "N2")

  const orgRepo = getOrganizationRepository()
  const org = await orgRepo.findById(input.organizationId)
  if (!org) throw notFound()

  const validTypes: organization_type[] = ["SINGLE", "STORE", "CHAIN"]
  if (!validTypes.includes(input.targetType as organization_type)) {
    throw validationFailed({ targetType: "Loại tổ chức không hợp lệ" })
  }

  const currentSettings =
    org.settings && typeof org.settings === "object"
      ? (org.settings as Record<string, unknown>)
      : {}

  const currentWorkflowPolicy =
    currentSettings.brochure_workflow_policy && typeof currentSettings.brochure_workflow_policy === "object"
      ? (currentSettings.brochure_workflow_policy as Record<string, unknown>)
      : {}

  const targetType = input.targetType
  const isChain = targetType === "CHAIN"

  const updatedSettings: Record<string, unknown> = {
    ...currentSettings,
    brochure_workflow_policy: {
      ...currentWorkflowPolicy,
      require_coordinator_acceptance: isChain,
    },
  }
  // Xóa yêu cầu chờ duyệt sau khi đã phê duyệt
  delete updatedSettings.pending_model_change

  await orgRepo.updateTypeAndSettings(org.id, targetType as organization_type, updatedSettings)

  await recordAuditLog(
    {
      organizationId: org.id,
      workspaceId: "",
      userId: pctx.userId,
      branchId: null,
      capabilities: new Set(["N2"]),
    },
    {
      action: "platform.organization_model_approved",
      entityType: "organizations",
      entityId: org.id,
      before: { type: org.type },
      after: {
        type: targetType,
        require_coordinator_acceptance: isChain,
        approved_by: pctx.userId,
        note: input.note ?? null,
      },
    }
  )

  return {
    success: true,
    targetType: targetType as organization_type,
    organizationId: org.id,
  }
}
