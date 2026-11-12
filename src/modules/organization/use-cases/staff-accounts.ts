import { randomBytes } from "node:crypto"
import { conflict, notFound, unprocessable, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { isAcceptablePassword, isValidEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/modules/organization/domain/credentials"
import { generateTemporaryPassword } from "@/modules/organization/domain/temporary-password"
import { canonicalVnPhone } from "@/modules/organization/domain/staff-phone"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { hashPassword, verifyPassword } from "@/modules/organization/infra/password-hasher"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"
import { StaffAccountRepository, getStaffAccountRepository } from "@/modules/organization/infra/staff-account-repository"
import { UserRepository, getUserRepository } from "@/modules/organization/infra/user-repository"
import { BranchRepository, getBranchRepository } from "@/modules/organization/infra/branch-repository"

const newTemporaryPassword = () => generateTemporaryPassword((n) => randomBytes(n))

export interface CreatedStaffAccount {
  membershipId: string
  userId: string
  email: string
  /** Hiện một lần cho Điều hành chép gửi nhân viên — không lưu ở đâu khác. */
  temporaryPassword: string
}

/**
 * `POST /members` (`A3`, trần cứng Điều hành — PO 08/10/2026): tạo tài khoản nhân viên dùng được ngay
 * (ĐANG HOẠT ĐỘNG) kèm mật khẩu tạm. Email đã có tài khoản ALG → 409: không chiếm quyền điều khiển
 * tài khoản người khác (dùng luồng "Mời" cho họ).
 */
export async function createStaffAccount(
  ctx: TenantContext,
  input: { name: string; email: string; roleId: string; branchId?: string | null | undefined; phone?: string | null | undefined }
): Promise<CreatedStaffAccount> {
  const email = normalizeEmail(input.email)
  const name = input.name.trim()
  const errors: Record<string, string> = {}
  if (!isValidEmail(email)) errors.email = "Email đăng nhập không hợp lệ (vd: sale1@tenquan.vn)"
  if (!name || name.length > 100) errors.name = "Nhập họ tên nhân viên (tối đa 100 ký tự)"
  const phone = input.phone?.trim() ? canonicalVnPhone(input.phone) : null
  if (input.phone?.trim() && !phone) errors.phone = "Số điện thoại không hợp lệ (vd: 0912345678)"
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  const role = await getRoleRepository().findAssignableById(ctx, input.roleId)
  if (!role) throw notFound()
  if (input.branchId && !(await getBranchRepository().findById(ctx, input.branchId))) throw notFound()
  if (await getUserRepository().findByEmail(email)) {
    throw conflict("Email này đã có tài khoản — dùng email khác cho nhân viên, hoặc bấm “Mời người đã có tài khoản” nếu đúng là người đó")
  }

  const temporaryPassword = newTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)
  const created = await getStaffAccountRepository().createActive(ctx, {
    email, name, passwordHash, roleId: role.id, branchId: input.branchId ?? null, phone,
  })
  await recordAuditLog(ctx, {
    action: "member.account.create",
    entityType: "memberships",
    entityId: created.membershipId,
    after: { userId: created.userId, email, roleKey: role.key },
  })
  return { ...created, email, temporaryPassword }
}

/** Thành viên của chính tổ chức (404 nếu không) và không phải chính người thao tác. */
async function targetMember(ctx: TenantContext, membershipId: string) {
  const membership = await getMembershipRepository().findById(ctx, membershipId)
  if (!membership) throw notFound()
  if (membership.user_id === ctx.userId) throw unprocessable("Không thao tác trên chính tài khoản của bạn ở đây")
  return membership
}

/**
 * `POST /members/:id/reset-password` (`A7`, trần cứng Điều hành): cấp mật khẩu tạm mới, đăng xuất người
 * đó ở mọi máy. Tài khoản còn thuộc tiệm khác → 409: Điều hành một tiệm không đổi được mật khẩu dùng ở
 * tiệm khác.
 */
export async function resetMemberPassword(ctx: TenantContext, membershipId: string): Promise<{ email: string; temporaryPassword: string }> {
  const membership = await targetMember(ctx, membershipId)
  const repo = getStaffAccountRepository()
  if (await repo.belongsToOtherOrganization(membership.user_id, ctx.organizationId)) {
    throw conflict("Tài khoản này còn dùng ở tiệm khác — nhờ chính người đó tự đổi mật khẩu")
  }
  const temporaryPassword = newTemporaryPassword()
  const email = await repo.setPassword(membership.user_id, await hashPassword(temporaryPassword), { revokeAllSessions: true })
  await recordAuditLog(ctx, { action: "member.password.reset", entityType: "memberships", entityId: membership.id, after: { userId: membership.user_id } })
  return { email, temporaryPassword }
}

/**
 * `PUT /members/:id/phone` (`A3`, trần cứng Điều hành): sửa số điện thoại nhân viên — Shipper được gắn đơn
 * qua số này (checklist ALG 4.5). Tài khoản còn thuộc tiệm khác → 409, như đặt lại mật khẩu.
 */
export async function setMemberPhone(ctx: TenantContext, membershipId: string, rawPhone: string | null): Promise<{ phone: string | null }> {
  const membership = await targetMember(ctx, membershipId)
  const phone = rawPhone?.trim() ? canonicalVnPhone(rawPhone) : null
  if (rawPhone?.trim() && !phone) throw validationFailed({ phone: "Số điện thoại không hợp lệ (vd: 0912345678)" })
  const repo = getStaffAccountRepository()
  if (await repo.belongsToOtherOrganization(membership.user_id, ctx.organizationId)) {
    throw conflict("Tài khoản này còn dùng ở tiệm khác — nhờ chính người đó tự cập nhật số điện thoại")
  }
  await repo.setPhone(membership.user_id, phone)
  await recordAuditLog(ctx, { action: "member.phone.update", entityType: "memberships", entityId: membership.id, after: { userId: membership.user_id } })
  return { phone }
}

/**
 * `PATCH /members/:id/status` (`A5`, trần cứng Điều hành): tạm khoá (SUSPENDED — đăng xuất ngay khỏi
 * tiệm này, giữ nguyên dữ liệu/đơn) hoặc mở lại (ACTIVE).
 */
export async function setMemberActive(ctx: TenantContext, membershipId: string, active: boolean): Promise<{ status: "ACTIVE" | "SUSPENDED" }> {
  const membership = await targetMember(ctx, membershipId)
  const status = active ? "ACTIVE" : "SUSPENDED"
  await getStaffAccountRepository().setStatus(ctx, membership.id, membership.user_id, status)
  await recordAuditLog(ctx, {
    action: active ? "member.account.reactivate" : "member.account.suspend",
    entityType: "memberships",
    entityId: membership.id,
    before: { status: membership.status },
    after: { status },
  })
  return { status }
}

/**
 * `POST /session/password` (`A2`): người đang đăng nhập tự đổi mật khẩu. Đúng mật khẩu hiện tại mới đổi;
 * các phiên khác của người này bị đăng xuất, phiên đang dùng giữ nguyên.
 */
export async function changeOwnPassword(
  ctx: TenantContext,
  input: { currentPassword: string; newPassword: string; keepSessionId: string }
): Promise<void> {
  const user = await getUserRepository().findById(ctx.userId)
  if (!user?.password_hash || !(await verifyPassword(input.currentPassword, user.password_hash))) {
    throw validationFailed({ currentPassword: "Mật khẩu hiện tại không đúng" })
  }
  if (!isAcceptablePassword(input.newPassword)) throw validationFailed({ newPassword: `Mật khẩu mới tối thiểu ${MIN_PASSWORD_LENGTH} ký tự` })
  if (input.newPassword === input.currentPassword) throw validationFailed({ newPassword: "Mật khẩu mới phải khác mật khẩu hiện tại" })
  await getStaffAccountRepository().setPassword(ctx.userId, await hashPassword(input.newPassword), { keepSessionId: input.keepSessionId })
  await recordAuditLog(ctx, { action: "user.password.change", entityType: "users", entityId: ctx.userId, after: {} })
}

