import { conflict, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { toSlug } from "@/modules/organization/domain/slug"
import { isSystemRoleKey } from "@/modules/organization/domain/system-roles"
import type { roles } from "@/modules/organization/infra/entities"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"

/**
 * `POST /roles` (`F5`, đặc tả 06 mục 4).
 *
 * Vai mới bắt đầu KHÔNG có năng lực nào — tổ chức bật từng mã sau đó qua
 * `PATCH /roles/:id/capabilities`. Không có "vai mẫu" để sao chép ở P2: sao
 * chép từ một vai hệ thống dễ đọc nhầm thành "vai này kế thừa vai kia", trong
 * khi mô hình quyền không có khái niệm kế thừa — mỗi vai là một switchboard
 * độc lập (đặc tả 02 mục 2).
 */
export async function createRole(ctx: TenantContext, input: { name: string }): Promise<roles> {
  const name = input.name.trim()
  if (name.length === 0) throw validationFailed({ name: "Tên vai không được để trống" })

  const base = toSlug(name) || "vai"
  if (isSystemRoleKey(base)) {
    throw conflict("Tên vai trùng với một vai hệ thống")
  }

  const repository = getRoleRepository()
  const existing = await repository.listForOrganization(ctx)
  const existingKeys = new Set(existing.map((role) => role.key))

  let key = base
  for (let i = 2; existingKeys.has(key); i += 1) key = `${base}-${i}`

  return repository.create(ctx, { key, name })
}
