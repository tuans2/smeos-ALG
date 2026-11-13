import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"

/**
 * Tài khoản nhân viên do Điều hành quản lý (PO 08/10/2026): tạo tài khoản đang hoạt động, đặt mật
 * khẩu, tạm khoá/mở. Mọi thao tác trên `memberships` đi qua tổ chức của `ctx`; thao tác trên `users`
 * (không mang `organization_id`) chỉ được gọi sau khi use-case đã kiểm người đó là thành viên của tổ chức.
 */
export class StaffAccountRepository {
  constructor(private readonly db = prisma) {}

  /** Người dùng + thành viên ĐANG HOẠT ĐỘNG trong MỘT giao dịch — hỏng giữa chừng không để tài khoản mồ côi. */
  async createActive(
    ctx: TenantContext,
    input: { email: string; name: string; passwordHash: string; roleId: string; branchId: string | null; phone?: string | null }
  ): Promise<{ membershipId: string; userId: string }> {
    return this.db.$transaction(async (tx) => {
      // Mật khẩu tạm → bắt buộc tự đổi ở lần đăng nhập đầu (checklist ALG 1.4)
      const user = await tx.users.create({ data: { email: input.email, name: input.name, password_hash: input.passwordHash, must_change_password: true, phone: input.phone ?? null } })
      const membership = await tx.memberships.create({
        data: scopedData(ctx, {
          user_id: user.id,
          role_id: input.roleId,
          branch_id: input.branchId,
          status: "ACTIVE" as const,
          joined_at: new Date(),
        }),
      })
      return { membershipId: membership.id, userId: user.id }
    })
  }

  async setPhone(userId: string, phone: string | null): Promise<void> {
    await this.db.users.update({ where: { id: userId }, data: { phone } })
  }

  /** Người này còn là thành viên (bất kỳ trạng thái) của tổ chức khác không. */
  async belongsToOtherOrganization(userId: string, organizationId: string): Promise<boolean> {
    return (await this.db.memberships.count({ where: { user_id: userId, organization_id: { not: organizationId } } })) > 0
  }

  /**
   * Đổi mật khẩu và đăng xuất: `revokeAllSessions` (Điều hành đặt lại — mọi máy) hoặc giữ đúng phiên
   * đang dùng (`keepSessionId`, người dùng tự đổi). Trả email để hiện cho Điều hành.
   */
  async setPassword(userId: string, passwordHash: string, opts: { revokeAllSessions?: true; keepSessionId?: string }): Promise<string> {
    return this.db.$transaction(async (tx) => {
      // Điều hành đặt lại → mật khẩu tạm, phải tự đổi; người dùng tự đổi → xoá cờ (checklist ALG 1.4)
      const mustChange = opts.revokeAllSessions === true
      const user = await tx.users.update({ where: { id: userId }, data: { password_hash: passwordHash, must_change_password: mustChange }, select: { email: true } })
      await tx.sessions.updateMany({
        where: { user_id: userId, revoked_at: null, ...(opts.keepSessionId ? { id: { not: opts.keepSessionId } } : {}) },
        data: { revoked_at: new Date() },
      })
      return user.email
    })
  }

  /** Tạm khoá / mở lại thành viên; khoá thì thu hồi ngay các phiên đang ở tổ chức này. */
  async setStatus(ctx: TenantContext, membershipId: string, userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.memberships.updateMany({ where: scopedWhere(ctx, { id: membershipId }), data: { status } })
      // Lời mời cũ (chưa từng vào) được kích hoạt: ghi ngày vào; người đã vào giữ nguyên ngày cũ
      if (status === "ACTIVE") {
        await tx.memberships.updateMany({ where: scopedWhere(ctx, { id: membershipId, joined_at: null }), data: { joined_at: new Date() } })
      }
      if (status === "SUSPENDED") {
        await tx.sessions.updateMany({
          where: { user_id: userId, organization_id: ctx.organizationId, revoked_at: null },
          data: { revoked_at: new Date() },
        })
      }
    })
  }

  /** Gỡ thành viên khỏi tổ chức và thu hồi ngay các phiên của người đó ở tổ chức này (tài khoản `users` giữ nguyên). */
  async removeMembership(ctx: TenantContext, membershipId: string, userId: string): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const result = await tx.memberships.deleteMany({ where: scopedWhere(ctx, { id: membershipId }) })
      await tx.sessions.updateMany({
        where: { user_id: userId, organization_id: ctx.organizationId, revoked_at: null },
        data: { revoked_at: new Date() },
      })
      return result.count > 0
    })
  }
}

let _staffAccountRepositorySingleton: StaffAccountRepository | null = null
export function getStaffAccountRepository(): StaffAccountRepository {
  if (!_staffAccountRepositorySingleton) _staffAccountRepositorySingleton = new StaffAccountRepository()
  return _staffAccountRepositorySingleton
}
