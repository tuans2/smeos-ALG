import { randomUUID } from "node:crypto"

import type { capability_overrides, capability_scope, role_capabilities, roles } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import { defaultCodesForSystemRole, isCapabilityCode } from "@/core/rbac/capability-catalog"
import { applyHardCap, applyRoleFloor, mergeOverrides, type CapabilityGrant } from "@/core/rbac/permission-resolver"
import { scopedData, type TenantContext } from "@/core/tenancy"
import { isSystemRoleKey } from "@/modules/organization/domain/system-roles"

import type { DbClient } from "./db-client"

/**
 * Lớp một và lớp hai của quyền — đặc tả 02 mục 1, đặc tả 07 mục 3.
 *
 * `role_capabilities` là bảng công tắc GỐC của một vai: với vai hệ thống
 * (`roles.organization_id = null`) nó là bản mặc định do `capability-catalog`
 * seed sẵn lúc `ensureSystemRoles`, dùng chung mọi tổ chức. Với vai riêng của
 * một tổ chức, nó bắt đầu rỗng — tổ chức bật từng mã qua chính ngoại lệ dưới
 * đây.
 *
 * `capability_overrides` là ngoại lệ THEO TỔ CHỨC, đè lên `role_capabilities`
 * của một vai, dùng thống nhất cho cả vai hệ thống lẫn vai riêng
 * (đặc tả 06 mục 4: `PATCH /roles/:id/capabilities` luôn ghi vào đây). Với vai
 * hệ thống, đây là chỗ DUY NHẤT một tổ chức chỉnh được quyền của vai đó, vì
 * tổ chức không sở hữu dòng `role_capabilities` dùng chung.
 *
 * Trần cứng (lớp ba) không nằm ở đây — `resolveGrants` gọi `applyHardCap`
 * sau khi gộp xong hai lớp trước, và sàn vai Điều hành (`applyRoleFloor`) ngay trước đó.
 */
export class CapabilityRepository {
  constructor(private readonly db: DbClient = prisma) {}

  private listForRole(roleId: string): Promise<role_capabilities[]> {
    return this.db.role_capabilities.findMany({ where: { role_id: roleId } })
  }

  private listOverridesRaw(organizationId: string, roleId: string): Promise<capability_overrides[]> {
    return this.db.capability_overrides.findMany({
      where: { organization_id: organizationId, role_id: roleId },
    })
  }

  /**
   * Ba lớp đầy đủ cho một vai, trong ngữ cảnh một tổ chức. Nhận
   * `organizationId` thẳng, không nhận `TenantContext` — đây là ngoại lệ dựng
   * ngữ cảnh, giống `RoleRepository.findAssignableByIdForOrganization`:
   * `resolveSession` gọi hàm này để NẠP `TenantContext.capabilities`, nên
   * chưa có `ctx` nào để truyền vào. Use-case đã có `ctx` sẵn thì gọi
   * `effectiveCodesForRole` thay vì hàm này.
   */
  async resolveGrants(organizationId: string, roleId: string, roleKey: string): Promise<CapabilityGrant[]> {
    const [base, overrides] = await Promise.all([
      this.listForRole(roleId),
      this.listOverridesRaw(organizationId, roleId),
    ])

    const baseMap = new Map<string, capability_scope>(
      base.map((row) => [row.capability_code, row.scope])
    )
    const merged = mergeOverrides(baseMap, overrides)
    // Sàn của vai Điều hành (F1/F5) thắng ngoại lệ cũ đã tắt chúng — audit API §34.
    return applyHardCap(roleKey, applyRoleFloor(roleKey, merged, baseMap))
  }

  /** Như `resolveGrants`, cho use-case đã có `TenantContext` sẵn. */
  async effectiveCodesForRole(ctx: TenantContext, role: Pick<roles, "id" | "key">): Promise<string[]> {
    const grants = await this.resolveGrants(ctx.organizationId, role.id, role.key)
    return grants.map((grant) => grant.code)
  }

  /**
   * Ngoại lệ đang ghi cho một vai, trong tổ chức của `ctx`. Dùng cho giao
   * diện quản lý quyền và cho bộ test cách ly — `capability_overrides` không
   * có ràng buộc khoá ngoại tới `organizations`, nên đây là chỗ duy nhất bộ
   * gác của bảng này được kiểm.
   */
  listOverridesForRole(ctx: TenantContext, roleId: string): Promise<capability_overrides[]> {
    return this.listOverridesRaw(ctx.organizationId, roleId)
  }

  /**
   * Nạp switchboard mặc định (lớp một) cho một vai HỆ THỐNG, lúc
   * `ensureSystemRoles`. Idempotent qua `skipDuplicates` — an toàn gọi lại
   * nhiều lần, khác với `roles` vốn cần khoá tư vấn vì `organization_id` có
   * thể null (xem `role-repository.ts`).
   */
  async seedDefaultsForSystemRole(roleId: string, roleKey: string): Promise<void> {
    if (!isSystemRoleKey(roleKey)) return
    const codes = defaultCodesForSystemRole(roleKey)
    if (codes.length === 0) return
    await this.db.role_capabilities.createMany({
      data: codes.map((code) => ({
        id: randomUUID(),
        role_id: roleId,
        capability_code: code,
        scope: "ORGANIZATION" as const,
      })),
      skipDuplicates: true,
    })
  }

  /**
   * Nguồn của `PATCH /roles/:id/capabilities` (đặc tả 06 mục 4). Ghi luôn vào
   * tổ chức của chính `ctx` — không đường nào truyền được `organizationId`
   * của tổ chức khác vào đây, giữ đúng bộ gác ở tầng repository (`YC-T3`).
   *
   * Không tự kiểm trần cứng. Use-case gọi hàm này **phải** từ chối yêu cầu
   * bật một mã bị trần cứng chặn với vai đó trước, và không được gọi hàm này
   * nếu bị chặn (đặc tả 06 mục 4: "không ghi gì"). Ghi `allowed: true` cho một
   * mã có trần cứng vẫn an toàn ở tầng đọc — `resolveGrants` luôn cắt lại —
   * nhưng đó là lớp an toàn thứ hai, không phải giấy phép bỏ qua kiểm ở API.
   */
  upsertOverride(
    ctx: TenantContext,
    input: { roleId: string; capabilityCode: string; allowed: boolean; updatedBy: string }
  ): Promise<capability_overrides> {
    if (!isCapabilityCode(input.capabilityCode)) {
      throw new Error(`Mã năng lực không tồn tại: ${input.capabilityCode}`)
    }
    return this.db.capability_overrides.upsert({
      where: {
        organization_id_role_id_capability_code: {
          organization_id: ctx.organizationId,
          role_id: input.roleId,
          capability_code: input.capabilityCode,
        },
      },
      create: scopedData(ctx, {
        id: randomUUID(),
        role_id: input.roleId,
        capability_code: input.capabilityCode,
        allowed: input.allowed,
        updated_by: input.updatedBy,
        updated_at: new Date(),
      }),
      update: { allowed: input.allowed, updated_by: input.updatedBy },
    })
  }
}

let _capabilityRepositorySingleton: CapabilityRepository | null = null
export function getCapabilityRepository(): CapabilityRepository {
  if (!_capabilityRepositorySingleton) _capabilityRepositorySingleton = new CapabilityRepository()
  return _capabilityRepositorySingleton
}
