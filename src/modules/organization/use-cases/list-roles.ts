import type { TenantContext } from "@/core/tenancy"
import { CapabilityRepository, getCapabilityRepository } from "@/modules/organization/infra/capability-repository"
import type { roles } from "@/modules/organization/infra/entities"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"
import { SYSTEM_ROLES } from "@/modules/organization/domain/system-roles"

export type RoleSummary = {
  id: string
  key: string
  name: string
  is_system: boolean
  capabilities: string[]
}

/**
 * `GET /roles` (`F1`, đặc tả 06 mục 4).
 *
 * Trả cả vai hệ thống lẫn vai riêng của tổ chức — người quản lý cần thấy cả
 * hai để quyết định gán vai nào cho ai. `capabilities` là năng lực hiệu lực
 * (đã qua ba lớp) trong CHÍNH tổ chức này, không phải bảng mặc định dùng
 * chung: một vai hệ thống có thể bị tổ chức này bớt hoặc thêm mã qua
 * `capability_overrides`.
 */
export async function listRoles(ctx: TenantContext): Promise<RoleSummary[]> {
  const roles = getRoleRepository()
  const capabilities = getCapabilityRepository()

  const [own, systemRoles] = await Promise.all([
    roles.listForOrganization(ctx),
    Promise.all(SYSTEM_ROLES.map((role) => roles.findSystemRoleByKey(role.key))),
  ])

  const all: roles[] = [...systemRoles.filter((role: roles | null): role is roles => role !== null), ...own]

  return Promise.all(
    all.map(async (role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      is_system: role.is_system,
      capabilities: await capabilities.effectiveCodesForRole(ctx, role),
    }))
  )
}
