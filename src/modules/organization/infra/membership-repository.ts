import type { membership_status, memberships } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"

import type { DbClient } from "./db-client"

export class MembershipRepository {
  constructor(private readonly db: DbClient = prisma) {}

  list(ctx: TenantContext): Promise<memberships[]> {
    return this.db.memberships.findMany({
      where: scopedWhere(ctx),
      orderBy: { invited_at: "asc" },
    })
  }

  findById(ctx: TenantContext, id: string): Promise<memberships | null> {
    return this.db.memberships.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  /** Tư cách thành viên của chính người đang đăng nhập, trong tổ chức hiện tại. */
  findForCurrentUser(ctx: TenantContext): Promise<memberships | null> {
    return this.db.memberships.findFirst({ where: scopedWhere(ctx, { user_id: ctx.userId }) })
  }

  /**
   * Tư cách thành viên của một người trong một tổ chức cụ thể.
   *
   * Đây là phép kiểm đứng sau `POST /session/organization` — chỗ duy nhất
   * client được nêu tên một tổ chức. Không tìm thấy thì tầng trên trả 404, vì
   * trả 403 là xác nhận tổ chức đó có thật (`YC-T4`).
   */
  findForUserInOrganization(
    userId: string,
    organizationId: string
  ): Promise<memberships | null> {
    return this.db.memberships.findFirst({
      where: { user_id: userId, organization_id: organizationId },
    })
  }

  /** Tổ chức đầu tiên người dùng còn hoạt động, dùng để chọn tổ chức lúc đăng nhập. */
  findFirstActiveForUser(userId: string): Promise<memberships | null> {
    return this.db.memberships.findFirst({
      where: { user_id: userId, status: "ACTIVE" },
      orderBy: { invited_at: "asc" },
    })
  }

  /** Chỉ dùng lúc đăng ký, khi tổ chức vừa ra đời và chưa có ngữ cảnh để gác. */
  createForNewOrganization(input: {
    organizationId: string
    userId: string
    roleId: string
    status: membership_status
    joinedAt: Date | null
  }): Promise<memberships> {
    return this.db.memberships.create({
      data: {
        organization_id: input.organizationId,
        user_id: input.userId,
        role_id: input.roleId,
        status: input.status,
        joined_at: input.joinedAt,
      },
    })
  }

  /**
   * Mời một người đã có `users.id` vào tổ chức hiện tại — nguồn của
   * `POST /members/invite` (`F3`, đặc tả 06 mục 4). Việc tìm-hoặc-tạo `users`
   * theo email thuộc use-case, không thuộc repository này: repository chỉ
   * biết về thành viên, không biết về danh tính.
   */
  invite(
    ctx: TenantContext,
    input: { userId: string; roleId: string; branchId: string | null }
  ): Promise<memberships> {
    return this.db.memberships.create({
      data: scopedData(ctx, {
        user_id: input.userId,
        role_id: input.roleId,
        branch_id: input.branchId,
        status: "INVITED" as const,
        joined_at: null,
      }),
    })
  }

  /** Gửi lại lời mời chưa nhận: làm mới `invited_at` (hạn 14 ngày tính lại), vai và chi nhánh (UJ-14). */
  async refreshInvitation(ctx: TenantContext, membershipId: string, input: { roleId: string; branchId: string | null }): Promise<memberships> {
    await this.db.memberships.updateMany({
      where: scopedWhere(ctx, { id: membershipId, status: "INVITED" as const }),
      data: { invited_at: new Date(), role_id: input.roleId, branch_id: input.branchId },
    })
    return this.db.memberships.findFirstOrThrow({ where: scopedWhere(ctx, { id: membershipId }) })
  }

  /**
   * Gỡ một thành viên — nguồn của `DELETE /members/:id` (`F4`). Đi qua
   * `deleteMany` với điều kiện tổ chức, không qua `delete` theo khoá chính,
   * cùng lý do với `BranchRepository.update`: tránh sửa được bản ghi của tổ
   * chức khác nếu đoán đúng id. Số dòng chạm tới bằng 0 nghĩa là không tìm
   * thấy — tầng trên dịch thành 404 (`YC-T4`).
   */
  async remove(ctx: TenantContext, id: string): Promise<boolean> {
    const result = await this.db.memberships.deleteMany({ where: scopedWhere(ctx, { id }) })
    return result.count > 0
  }

  /** Đổi vai của một thành viên — nguồn của `PATCH /members/:id/role` (`F5`). */
  async updateRole(ctx: TenantContext, id: string, roleId: string): Promise<memberships | null> {
    const result = await this.db.memberships.updateMany({
      where: scopedWhere(ctx, { id }),
      data: { role_id: roleId },
    })
    if (result.count === 0) return null
    return this.findById(ctx, id)
  }
}

let _membershipRepositorySingleton: MembershipRepository | null = null
export function getMembershipRepository(db?: DbClient): MembershipRepository {
  if (db) return new MembershipRepository(db)
  if (!_membershipRepositorySingleton) _membershipRepositorySingleton = new MembershipRepository()
  return _membershipRepositorySingleton
}
