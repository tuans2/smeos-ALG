import { conflict, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"

const REQUESTABLE_TYPES = ["SINGLE", "STORE", "CHAIN"] as const

export type RequestedOrganizationType = (typeof REQUESTABLE_TYPES)[number]

export function isRequestableOrganizationType(value: string): value is RequestedOrganizationType {
  return (REQUESTABLE_TYPES as readonly string[]).includes(value)
}

export type RequestOrganizationUpgradeInput = {
  requestedType: RequestedOrganizationType
  note?: string | null
}

export type PendingModelChange = {
  requested_type: RequestedOrganizationType
  requested_at: string
  requested_by: string
  note: string | null
}

/**
 * Ghi lại yêu cầu chuyển đổi mô hình tổ chức (1 cửa hàng ↔ Chuỗi, hoặc từ Trải nghiệm lên thật).
 *
 * KHÔNG tự đổi `organizations.type` ngay lập tức: Việc chuyển đổi mô hình làm thay đổi
 * luồng duyệt đơn (Gate 2), số chi nhánh và quy mô vận hành, BẮT BUỘC phải được Quản trị viên
 * SaaS (Admin) thẩm định và phê duyệt.
 *
 * Yêu cầu được lưu vào `settings.pending_model_change` để hiển thị trạng thái chờ duyệt trên UI,
 * đồng thời ghi vết vào `audit_logs` để Admin SaaS theo dõi và xử lý tại Console Vận hành.
 */
export async function requestOrganizationUpgrade(
  ctx: TenantContext,
  input: RequestOrganizationUpgradeInput
): Promise<{ recorded: true; pendingChange: PendingModelChange }> {
  const orgRepo = getOrganizationRepository()
  const organization = await orgRepo.current(ctx)
  if (!organization) throw validationFailed({ organization: "Không tìm thấy tổ chức" })

  const requestedType = input.requestedType
  if (organization.type === requestedType) {
    throw conflict("Tổ chức của bạn hiện đã ở mô hình này")
  }

  const currentSettings =
    organization.settings && typeof organization.settings === "object"
      ? (organization.settings as Record<string, unknown>)
      : {}

  const pendingChange: PendingModelChange = {
    requested_type: requestedType,
    requested_at: new Date().toISOString(),
    requested_by: ctx.userId,
    note: input.note ?? null,
  }

  await orgRepo.updateSettings(ctx, {
    ...currentSettings,
    pending_model_change: pendingChange,
  })

  await recordAuditLog(ctx, {
    action: "organization.upgrade_requested",
    entityType: "organizations",
    entityId: organization.id,
    before: { type: organization.type },
    after: { requested_type: requestedType, note: input.note ?? null },
  })

  return { recorded: true, pendingChange }
}

