/**
 * Thêm một tài khoản MỚI làm thành viên của một tổ chức đã có — CÔNG CỤ PHÁT
 * TRIỂN CỤC BỘ, cùng nhóm với `dat-lai-mat-khau.ts`.
 *
 * Khác `signUp` (API đăng ký công khai, luôn tạo tổ chức mới): script này
 * KHÔNG tạo tổ chức/workspace mới, chỉ gắn một user mới (hoặc user đã có,
 * nếu email trùng) vào một organization_id truyền sẵn. Dùng khi cần thêm
 * người thật vào một tổ chức demo/thật đã dựng sẵn (vd AVI GIFT), không qua
 * luồng "Dùng thử miễn phí" (luồng đó luôn sinh tổ chức rỗng mới).
 *
 *   npm run them-thanh-vien -- --email=ai@do.com --password=<mật khẩu> --org-id=<uuid> [--name="Tên"] [--role=dieu_hanh]
 */
import { prisma } from "@/core/tenancy/infra/prisma"
import { isAcceptablePassword, isValidEmail, normalizeEmail } from "@/modules/organization/domain/credentials"
import { hashPassword } from "@/modules/organization/infra/password-hasher"

function doc(ten: string): string | null {
  const co = process.argv.find((tham_so) => tham_so.startsWith(`--${ten}=`))
  return co ? co.slice(ten.length + 3) : null
}

async function main(): Promise<void> {
  const emailTho = doc("email")
  const matKhau = doc("password")
  const orgId = doc("org-id")
  const ten = doc("name")
  const roleKey = doc("role") ?? "dieu_hanh"

  if (!emailTho || !matKhau || !orgId) {
    console.error(
      'Dùng: npm run them-thanh-vien -- --email=<địa chỉ thư> --password=<mật khẩu> --org-id=<uuid> [--name="Tên"] [--role=dieu_hanh]'
    )
    process.exit(1)
  }

  const email = normalizeEmail(emailTho)
  if (!isValidEmail(email)) {
    console.error(`Địa chỉ thư không hợp lệ: ${emailTho}`)
    process.exit(1)
  }
  if (!isAcceptablePassword(matKhau)) {
    console.error("Mật khẩu không đạt luật hiện hành (xem domain/credentials.ts)")
    process.exit(1)
  }

  const organization = await prisma.organizations.findUnique({ where: { id: orgId } })
  if (!organization) {
    console.error(`Không có tổ chức nào với id ${orgId}`)
    process.exit(1)
  }

  const role = await prisma.roles.findFirst({
    where: { key: roleKey, OR: [{ organization_id: orgId }, { organization_id: null }] },
  })
  if (!role) {
    console.error(`Không tìm thấy vai "${roleKey}" (hệ thống hoặc riêng của tổ chức). Chạy \`npm run db:seed\`?`)
    process.exit(1)
  }

  let user = await prisma.users.findUnique({ where: { email } })
  if (user) {
    console.log(`Tài khoản ${email} đã tồn tại (id=${user.id}) — dùng lại, không đổi mật khẩu.`)
  } else {
    user = await prisma.users.create({
      data: { email, password_hash: await hashPassword(matKhau), name: ten ?? null },
    })
    console.log(`Đã tạo tài khoản mới: ${email} (id=${user.id})`)
  }

  const existingMembership = await prisma.memberships.findUnique({
    where: { organization_id_user_id: { organization_id: orgId, user_id: user.id } },
  })
  if (existingMembership) {
    console.log(`Đã là thành viên của tổ chức này rồi (role_id hiện tại: ${existingMembership.role_id}) — không đổi gì.`)
  } else {
    await prisma.memberships.create({
      data: {
        organization_id: orgId,
        user_id: user.id,
        role_id: role.id,
        status: "ACTIVE",
        joined_at: new Date(),
      },
    })
    console.log(`Đã thêm ${email} vào tổ chức "${organization.name}" với vai "${role.name}".`)
  }

  await prisma.$disconnect()
}

main().catch(async (loi) => {
  console.error(loi)
  await prisma.$disconnect()
  process.exit(1)
})
