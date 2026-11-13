import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { PlatformContext } from "@/core/platform/platform-context"
import { requestOrganizationUpgrade } from "@/modules/organization/use-cases/request-organization-upgrade"
import { approveOrganizationModelChange } from "@/modules/platform/use-cases/approve-organization-model-change"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import * as auditModule from "@/modules/audit/use-cases/record-audit-log"
import { signUp } from "@/modules/organization/use-cases/sign-up"

const tenantCtx: TenantContext = {
  organizationId: "org-test-model-1",
  workspaceId: "ws-1",
  userId: "user-owner-1",
  branchId: null,
  capabilities: new Set(["F2", "H4"]),
}

const platformCtx: PlatformContext = {
  userId: "user-admin-1",
  capabilities: new Set(["N1", "N2"]),
}

describe("Quy trình Yêu cầu & Phê duyệt chuyển đổi mô hình (1 Cửa hàng ↔ Chuỗi)", () => {
  it("Tổ chức SINGLE gửi yêu cầu chuyển sang CHAIN: lưu pending_model_change và ghi audit log", async () => {
    const auditSpy = vi.spyOn(auditModule, "recordAuditLog").mockResolvedValue(undefined as never)

    const updateSettingsSpy = vi
      .spyOn(OrganizationRepository.prototype, "updateSettings")
      .mockResolvedValue(undefined)

    vi.spyOn(OrganizationRepository.prototype, "current").mockResolvedValue({
      id: "org-test-model-1",
      name: "Tiệm Hoa Một Cửa Hàng",
      slug: "tiem-hoa-1",
      type: "SINGLE",
      credit_balance: 100,
      credit_plan: null,
      settings: {
        industry: "FLORAL",
      },
      data_region: "vn",
      created_at: new Date(),
      updated_at: new Date(),
    })

    const result = await requestOrganizationUpgrade(tenantCtx, {
      requestedType: "CHAIN",
      note: "Chuẩn bị mở thêm chi nhánh mới tại Quận 3",
    })

    expect(result.recorded).toBe(true)
    expect(result.pendingChange.requested_type).toBe("CHAIN")
    expect(result.pendingChange.note).toBe("Chuẩn bị mở thêm chi nhánh mới tại Quận 3")

    expect(updateSettingsSpy).toHaveBeenCalledWith(
      tenantCtx,
      expect.objectContaining({
        pending_model_change: expect.objectContaining({
          requested_type: "CHAIN",
          requested_by: "user-owner-1",
        }),
      })
    )

    expect(auditSpy).toHaveBeenCalledWith(
      tenantCtx,
      expect.objectContaining({
        action: "organization.upgrade_requested",
        after: expect.objectContaining({ requested_type: "CHAIN" }),
      })
    )
  })

  it("Tổ chức gửi yêu cầu trùng với mô hình hiện tại: bị từ chối với conflict", async () => {
    vi.spyOn(OrganizationRepository.prototype, "current").mockResolvedValue({
      id: "org-test-model-1",
      name: "Tiệm Hoa Chuỗi",
      slug: "tiem-hoa-chuoi",
      type: "CHAIN",
      credit_balance: 100,
      credit_plan: null,
      settings: {},
      data_region: "vn",
      created_at: new Date(),
      updated_at: new Date(),
    })

    await expect(
      requestOrganizationUpgrade(tenantCtx, {
        requestedType: "CHAIN",
      })
    ).rejects.toThrow("Tổ chức của bạn hiện đã ở mô hình này")
  })

  it("Admin SaaS (N2) phê duyệt chuyển sang CHAIN: cập nhật type, kích hoạt Gate 2, xóa pending request", async () => {
    const auditSpy = vi.spyOn(auditModule, "recordAuditLog").mockResolvedValue(undefined as never)

    vi.spyOn(OrganizationRepository.prototype, "findById").mockResolvedValue({
      id: "org-test-model-1",
      name: "Tiệm Hoa",
      slug: "tiem-hoa",
      type: "SINGLE",
      credit_balance: 100,
      credit_plan: null,
      settings: {
        brochure_workflow_policy: { require_coordinator_acceptance: false },
        pending_model_change: {
          requested_type: "CHAIN",
          requested_at: new Date().toISOString(),
          requested_by: "user-1",
          note: "Mở chi nhánh",
        },
      },
      data_region: "vn",
      created_at: new Date(),
      updated_at: new Date(),
    })

    const updateTypeSpy = vi
      .spyOn(OrganizationRepository.prototype, "updateTypeAndSettings")
      .mockResolvedValue({} as never)

    const result = await approveOrganizationModelChange(platformCtx, {
      organizationId: "org-test-model-1",
      targetType: "CHAIN",
      note: "Đã thẩm định cơ sở chi nhánh",
    })

    expect(result.success).toBe(true)
    expect(result.targetType).toBe("CHAIN")

    // Xác nhận require_coordinator_acceptance được bật thành true cho Chuỗi
    // và pending_model_change bị xóa
    expect(updateTypeSpy).toHaveBeenCalledWith(
      "org-test-model-1",
      "CHAIN",
      expect.objectContaining({
        brochure_workflow_policy: expect.objectContaining({
          require_coordinator_acceptance: true,
        }),
      })
    )

    // Xác nhận pending_model_change đã bị gỡ bỏ
    const callArgs = updateTypeSpy.mock.calls[0]
    expect(callArgs).toBeDefined()
    const savedSettings = (callArgs?.[2] ?? {}) as Record<string, unknown>
    expect(savedSettings.pending_model_change).toBeUndefined()

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-admin-1" }),
      expect.objectContaining({
        action: "platform.organization_model_approved",
      })
    )
  })

  it("Người vận hành không có quyền N2: bị chặn khi duyệt đổi mô hình", async () => {
    const noPermissionCtx: PlatformContext = {
      userId: "user-viewer-1",
      capabilities: new Set(["N1"]), // chỉ có xem N1, không có N2
    }

    await expect(
      approveOrganizationModelChange(noPermissionCtx, {
        organizationId: "org-test-model-1",
        targetType: "CHAIN",
      })
    ).rejects.toThrow("Thiếu năng lực nền tảng N2")
  })
})
