import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { prisma } from "@/core/tenancy/infra/prisma"
import { hashPassword } from "@/modules/organization/infra/password-hasher"

import { PlatformOperatorRepository } from "./platform-operator-repository"

/**
 * Dọn tài khoản trước khi bàn giao (PO 22/10/2026): xoá hẳn mọi tài khoản trừ MỘT, và biến tài
 * khoản đó thành superadmin nền tảng (đủ mã N). Chỉ dùng qua `scripts/don-tai-khoan.ts`.
 *
 * Xoá `users` kéo theo `sessions`, `memberships`, `platform_operators` (FK `CASCADE`). Các cột như
 * `orders.created_by` chỉ lưu id dạng chuỗi, nên lịch sử đơn và nhật ký vẫn còn. Tổ chức không bị
 * xoá: tổ chức nào hết thành viên sẽ được liệt kê để người chạy tự quyết.
 */
export interface AccountCleanupPlan {
  keep: { id: string; email: string }
  remove: Array<{ id: string; email: string }>
  /** Tổ chức sẽ không còn thành viên nào sau khi xoá. */
  orphanedOrganizations: Array<{ id: string; name: string }>
}

export const MIN_PASSWORD_LENGTH = 12

export async function planAccountCleanup(keepEmail: string): Promise<AccountCleanupPlan> {
  const keep = await prisma.users.findUnique({ where: { email: keepEmail }, select: { id: true, email: true } })
  if (!keep) throw new Error(`Không có tài khoản ${keepEmail} — dừng, không xoá gì.`)
  const remove = await prisma.users.findMany({
    where: { id: { not: keep.id } },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  })
  const orphanedOrganizations = await prisma.organizations.findMany({
    where: { memberships: { none: { user_id: keep.id } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return { keep, remove, orphanedOrganizations }
}

/** Thực hiện kế hoạch. `newPassword` (tuỳ chọn) đổi mật khẩu tài khoản giữ lại và đăng xuất phiên cũ. */
export async function applyAccountCleanup(plan: AccountCleanupPlan, newPassword?: string): Promise<void> {
  if (newPassword !== undefined && newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Mật khẩu mới phải dài ít nhất ${MIN_PASSWORD_LENGTH} ký tự — dừng, không xoá gì.`)
  }
  const passwordHash = newPassword === undefined ? undefined : await hashPassword(newPassword)
  await prisma.$transaction(async (tx) => {
    await tx.users.deleteMany({ where: { id: { in: plan.remove.map((u) => u.id) }, NOT: { id: plan.keep.id } } })
    if (passwordHash) {
      await tx.users.update({ where: { id: plan.keep.id }, data: { password_hash: passwordHash } })
      await tx.sessions.updateMany({ where: { user_id: plan.keep.id, revoked_at: null }, data: { revoked_at: new Date() } })
    }
  })
  await new PlatformOperatorRepository().grant(plan.keep.id, [...ALL_PLATFORM_CAPABILITY_CODES], null)
}
