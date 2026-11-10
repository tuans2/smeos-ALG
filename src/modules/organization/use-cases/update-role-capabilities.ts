import { AppError, notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { isCapabilityCode } from "@/core/rbac/capability-catalog"
import { breaksRoleFloor, passesHardCap } from "@/core/rbac/permission-resolver"
import type { TenantContext } from "@/core/tenancy"
import { CapabilityRepository, getCapabilityRepository } from "@/modules/organization/infra/capability-repository"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"

export type CapabilityChange = { code: string; allowed: boolean }

/**
 * `PATCH /roles/:id/capabilities` (`F5`, đặc tả 06 mục 4).
 *
 * Ghi vào `capability_overrides` — chỗ duy nhất một tổ chức chỉnh quyền của
 * MỘT vai, kể cả vai hệ thống dùng chung (`src/core/rbac/README.md`).
 *
 * **Yêu cầu bật một mã bị trần cứng chặn với vai này bị từ chối, và KHÔNG ghi
 * gì** — kể cả những mã hợp lệ khác trong cùng yêu cầu. Tắt mã thuộc sàn của vai Điều hành (`F1`, `F5`) cũng bị từ
 * chối (422) và không ghi gì (audit API §30). Trần cứng cắt sau
 * bảng công tắc; chấp nhận một phần yêu cầu là mở một khe hở im lặng: người
 * gọi tưởng cả yêu cầu đã áp dụng.
 */
export async function updateRoleCapabilities(
  ctx: TenantContext,
  roleId: string,
  changes: CapabilityChange[]
): Promise<string[]> {
  if (changes.length === 0) throw validationFailed({ changes: "Danh sách rỗng" })

  const roles = getRoleRepository()
  const role = await roles.findAssignableById(ctx, roleId)
  if (!role) throw notFound()

  for (const change of changes) {
    if (!isCapabilityCode(change.code)) {
      throw validationFailed({ code: `Mã năng lực không tồn tại: ${change.code}` })
    }
    if (change.allowed && !passesHardCap(change.code, role.key)) {
      throw new AppError("CAPABILITY_DENIED", `Trần cứng chặn ${change.code} với vai này`, {
        capability: change.code,
      })
    }
    if (!change.allowed && breaksRoleFloor(change.code, role.key)) {
      throw unprocessable(`Không tắt được ${change.code} trên vai Điều hành — tắt thì không ai bật lại được`, { capability: change.code })
    }
  }

  const capabilities = getCapabilityRepository()
  for (const change of changes) {
    await capabilities.upsertOverride(ctx, {
      roleId: role.id,
      capabilityCode: change.code,
      allowed: change.allowed,
      updatedBy: ctx.userId,
    })
  }

  return capabilities.effectiveCodesForRole(ctx, role)
}
