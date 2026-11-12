import { prisma } from "@/core/tenancy/infra/prisma"
import { isValidEmail, normalizeEmail } from "@/modules/organization/domain/credentials"
import { hashPassword } from "@/modules/organization/infra/password-hasher"
import { signUp } from "@/modules/organization/use-cases/sign-up"

/**
 * Hai tài khoản chuyên test chức năng (PO 22/10/2026), dùng qua `scripts/tao-tai-khoan-test.ts`:
 * - chủ tiệm (vai `dieu_hanh`) tạo bằng đúng luồng đăng ký thật, kèm tổ chức riêng "ALG QA";
 * - nhân viên vai hạn chế (mặc định `sale`) trong CÙNG tổ chức, để thử phân quyền.
 * Không cấp mã nền tảng (N) cho tài khoản nào — superadmin nền tảng chỉ có một người.
 */
export const QA_ORGANIZATION_NAME = "ALG QA"
export const QA_MIN_PASSWORD_LENGTH = 12

export interface QaAccountsInput {
  ownerEmail: string
  ownerPassword: string
  staffEmail: string
  staffPassword: string
  staffRoleKey: string
}

export interface QaAccountsResult {
  organizationId: string
  ownerUserId: string
  staffUserId: string
}

/** Lỗi nhập liệu hoặc xung đột — trả câu tiếng Việt; rỗng nghĩa là chạy được. */
export async function qaAccountsProblems(input: QaAccountsInput): Promise<string[]> {
  const problems: string[] = []
  const owner = normalizeEmail(input.ownerEmail)
  const staff = normalizeEmail(input.staffEmail)
  for (const email of [owner, staff]) {
    if (!isValidEmail(email)) problems.push(`Địa chỉ thư không hợp lệ: ${email}`)
    else if (await prisma.users.findUnique({ where: { email } })) problems.push(`Đã có tài khoản ${email} — không ghi đè.`)
  }
  if (owner === staff) problems.push("Hai tài khoản phải khác địa chỉ thư.")
  for (const [label, password] of [["chủ tiệm", input.ownerPassword], ["nhân viên", input.staffPassword]] as const) {
    if (password.length < QA_MIN_PASSWORD_LENGTH) problems.push(`Mật khẩu ${label} phải dài ít nhất ${QA_MIN_PASSWORD_LENGTH} ký tự.`)
  }
  if (input.ownerPassword === input.staffPassword) problems.push("Hai tài khoản phải dùng hai mật khẩu khác nhau.")
  const role = await prisma.roles.findFirst({ where: { key: input.staffRoleKey, organization_id: null } })
  if (!role) problems.push(`Không có vai hệ thống "${input.staffRoleKey}".`)
  return problems
}

export async function createQaAccounts(input: QaAccountsInput): Promise<QaAccountsResult> {
  const problems = await qaAccountsProblems(input)
  if (problems.length > 0) throw new Error(problems.join("\n"))

  const owner = await signUp({
    email: input.ownerEmail,
    password: input.ownerPassword,
    name: "Tài khoản test 01",
    organizationName: QA_ORGANIZATION_NAME,
  })
  // Đăng ký mở sẵn một phiên cho trình duyệt; ở đây không có trình duyệt nào giữ nó.
  await prisma.sessions.updateMany({ where: { user_id: owner.userId, revoked_at: null }, data: { revoked_at: new Date() } })

  const role = await prisma.roles.findFirstOrThrow({ where: { key: input.staffRoleKey, organization_id: null } })
  const passwordHash = await hashPassword(input.staffPassword)
  const staff = await prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: { email: normalizeEmail(input.staffEmail), password_hash: passwordHash, name: "Tài khoản test 02" },
    })
    await tx.memberships.create({
      data: { organization_id: owner.organizationId, user_id: user.id, role_id: role.id, status: "ACTIVE", joined_at: new Date() },
    })
    return user
  })
  return { organizationId: owner.organizationId, ownerUserId: owner.userId, staffUserId: staff.id }
}
