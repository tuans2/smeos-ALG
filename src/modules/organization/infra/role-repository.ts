import { randomUUID } from "node:crypto"

import type { roles } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { SYSTEM_ROLES } from "@/modules/organization/domain/system-roles"

import { CapabilityRepository } from "./capability-repository"
import type { DbClient } from "./db-client"

export class RoleRepository {
  constructor(private readonly db: DbClient = prisma) {}

  /**
   * Vai của tổ chức hiện tại. Vai hệ thống (`organization_id = null`) không
   * nằm trong danh sách này — chúng là danh mục dùng chung, đọc bằng
   * `findSystemRoleByKey`.
   */
  listForOrganization(ctx: TenantContext): Promise<roles[]> {
    return this.db.roles.findMany({
      where: scopedWhere(ctx),
      orderBy: { created_at: "asc" },
    })
  }

  findById(ctx: TenantContext, id: string): Promise<roles | null> {
    return this.db.roles.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  /**
   * Vai gán được cho một thành viên của tổ chức hiện tại: vai riêng của tổ
   * chức, cộng với vai hệ thống dùng chung (`organization_id = null`, đặc tả
   * 07 mục 3). Đây là ngoại lệ duy nhất của bộ gác, và nó nằm trong lược đồ
   * chứ không phải trong mã: cột `roles.organization_id` được khai là nullable
   * đúng vì mục đích này.
   */
  findAssignableById(ctx: TenantContext, id: string): Promise<roles | null> {
    return this.db.roles.findFirst({
      where: {
        id,
        OR: [{ organization_id: ctx.organizationId }, { organization_id: null }],
      },
    })
  }

  /**
   * Như `findAssignableById`, nhưng dùng lúc chưa có `TenantContext` — ở
   * `resolve-session.ts`, đây chính là bước *dựng* ngữ cảnh nên chưa có gì để
   * gác (giống lý do `MembershipRepository.findForUserInOrganization` không
   * nhận ctx).
   */
  findAssignableByIdForOrganization(organizationId: string, id: string): Promise<roles | null> {
    return this.db.roles.findFirst({
      where: { id, OR: [{ organization_id: organizationId }, { organization_id: null }] },
    })
  }

  /** Vai riêng của tổ chức. Gán năng lực cho vai thuộc P2. */
  create(ctx: TenantContext, input: { key: string; name: string }): Promise<roles> {
    return this.db.roles.create({
      data: scopedData(ctx, { id: randomUUID(), key: input.key, name: input.name, is_system: false }),
    })
  }

  findSystemRoleByKey(key: string): Promise<roles | null> {
    return this.db.roles.findFirst({ where: { organization_id: null, key } })
  }

  /**
   * Nạp bốn vai hệ thống. Idempotent, gọi lại nhiều lần không sinh bản trùng.
   *
   * Khoá tư vấn ở dòng đầu là bắt buộc, không phải phòng xa: ràng buộc
   * `@@unique([organization_id, key])` **không** chặn được trùng ở đây, vì
   * Postgres coi mọi NULL là phân biệt nhau và vai hệ thống mang
   * `organization_id = null`. Hai lời gọi song song không có khoá này sẽ tạo ra
   * hai bộ vai hệ thống.
   *
   * Gọi qua use-case `ensureSystemRoles`, vì khoá `xact` chỉ có tác dụng bên
   * trong một giao dịch.
   */
  async ensureSystemRoles(): Promise<void> {
    await this.db.$executeRawUnsafe("SELECT pg_advisory_xact_lock(4207001)")

    const capabilities = new CapabilityRepository(this.db)
    for (const role of SYSTEM_ROLES) {
      const existing = await this.findSystemRoleByKey(role.key)
      // Tên vai hệ thống theo danh mục (vd. đổi tên tiếng Việt) — bản cài cũ được cập nhật ở lần seed kế tiếp
      if (existing && existing.name !== role.name) await this.db.roles.update({ where: { id: existing.id }, data: { name: role.name } })
      const record =
        existing ??
        (await this.db.roles.create({
          data: { id: randomUUID(), organization_id: null, key: role.key, name: role.name, is_system: true },
        }))

      // Idempotent qua `skipDuplicates` — an toàn gọi lại dù vai đã có sẵn,
      // và là cách một catalog năng lực thêm mã mới tự nạp vào vai hệ thống
      // ở lần seed kế tiếp mà không cần một đường migrate riêng.
      await capabilities.seedDefaultsForSystemRole(record.id, record.key)
    }
  }
}

let _roleRepositorySingleton: RoleRepository | null = null
export function getRoleRepository(db?: DbClient): RoleRepository {
  if (db) return new RoleRepository(db)
  if (!_roleRepositorySingleton) _roleRepositorySingleton = new RoleRepository()
  return _roleRepositorySingleton
}
