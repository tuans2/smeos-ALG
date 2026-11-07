import { conflict, notFound, unprocessable, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { isValidEmail, normalizeEmail } from "@/modules/organization/domain/credentials"
import { BranchRepository, getBranchRepository } from "@/modules/organization/infra/branch-repository"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"
import { UserRepository, getUserRepository } from "@/modules/organization/infra/user-repository"

export type InviteMemberInput = {
  email: string
  roleId: string
  branchId?: string | null
}

export const NEW_EMAIL_MESSAGE =
  "Email này chưa có tài khoản — dùng nút “Thêm nhân viên” để tạo tài khoản đăng nhập dùng được ngay."

/**
 * `POST /members/invite` (`F3`, đặc tả 06 mục 4).
 *
 * Chỉ mời người ĐÃ có tài khoản (vd. nhân viên đang làm ở tiệm khác). Người mới dùng "Thêm nhân viên"
 * (`POST /members`, `staff-accounts.ts`) — bước nhận lời mời/đặt mật khẩu chưa có (UJ-14, chờ PO).
 */

export async function inviteMember(ctx: TenantContext, input: InviteMemberInput) {
  const email = normalizeEmail(input.email)
  if (!isValidEmail(email)) throw validationFailed({ email: "Địa chỉ thư không hợp lệ" })

  const roles = getRoleRepository()
  const role = await roles.findAssignableById(ctx, input.roleId)
  if (!role) throw notFound()

  if (input.branchId) {
    const branch = await getBranchRepository().findById(ctx, input.branchId)
    if (!branch) throw notFound()
  }

  const users = getUserRepository()
  const memberships = getMembershipRepository()

  const existingForOrg = await memberships.list(ctx)
  const existingUser = await users.findByEmail(email)
  const current = existingUser ? existingForOrg.find((m) => m.user_id === existingUser.id) : undefined
  // Lời mời cũ chưa nhận (có thể đã hết hạn 14 ngày) → gửi lại: làm mới hạn, vai, chi nhánh (UJ-14)
  if (current?.status === "INVITED") {
    return memberships.refreshInvitation(ctx, current.id, { roleId: role.id, branchId: input.branchId ?? null })
  }
  if (current) throw conflict("Người này đã là thành viên của tổ chức")

  // Chưa có luồng nhận lời mời/đặt mật khẩu: tạo tài khoản mật khẩu rỗng là tạo người không bao giờ đăng nhập
  // được (audit hành trình M1, gói UJ-06). Người mới → "Thêm nhân viên" (tài khoản dùng được ngay).
  if (!existingUser) throw unprocessable(NEW_EMAIL_MESSAGE)

  return memberships.invite(ctx, {
    userId: existingUser.id,
    roleId: role.id,
    branchId: input.branchId ?? null,
  })
}
