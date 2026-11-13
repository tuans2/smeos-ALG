/**
 * Gán quyền vận hành nền tảng cho MỘT tài khoản đã có — CÔNG CỤ CHẠY TAY,
 * không qua API (chốt 19/09: một người vận hành duy nhất cho P25, không
 * làm màn cấp/thu quyền). Cùng nhóm với `them-thanh-vien.ts`.
 *
 * Ghi vào `platform_operators` + `platform_role_capabilities` — TÁCH HẲN
 * khỏi `memberships`/`role_capabilities` của tenant (D-N6). Tài khoản vẫn
 * có thể đồng thời là thành viên một tổ chức bình thường; hai vai trò
 * không loại trừ nhau (ngữ cảnh song song, xem
 * src/core/platform/platform-context.ts).
 *
 *   npm run gan-van-hanh-nen-tang -- --email=ai@do.com [--capabilities=N1,N4,N5,N6] [--granted-by=<user_id>]
 *
 * Không truyền `--capabilities` thì gán đủ N1–N8. Tài khoản đang chờ duyệt đăng ký được duyệt luôn — cách duy nhất
 * để người vận hành đầu tiên của hệ thống mới dựng đăng nhập được (chưa có ai khác để duyệt).
 */
import { prisma } from "@/core/tenancy/infra/prisma"
import { ALL_PLATFORM_CAPABILITY_CODES, isPlatformCapabilityCode } from "@/core/platform/platform-capability-catalog"
import { grantPlatformOperator } from "@/modules/platform/use-cases/grant-platform-operator"

function doc(ten: string): string | null {
  const co = process.argv.find((tham_so) => tham_so.startsWith(`--${ten}=`))
  return co ? co.slice(ten.length + 3) : null
}

async function main(): Promise<void> {
  const emailTho = doc("email")
  const capabilitiesTho = doc("capabilities")
  const grantedBy = doc("granted-by")

  if (!emailTho) {
    console.error(
      "Dùng: npm run gan-van-hanh-nen-tang -- --email=<địa chỉ thư> [--capabilities=N1,N4,N5,N6] [--granted-by=<user_id>]"
    )
    process.exit(1)
  }

  const capabilityCodes = capabilitiesTho
    ? capabilitiesTho.split(",").map((c) => c.trim().toUpperCase())
    : [...ALL_PLATFORM_CAPABILITY_CODES]

  for (const code of capabilityCodes) {
    if (!isPlatformCapabilityCode(code)) {
      console.error(`Mã năng lực nền tảng không tồn tại: ${code} (xem src/core/platform/platform-capability-catalog.ts)`)
      process.exit(1)
    }
  }

  const email = emailTho.trim().toLowerCase()
  const user = await prisma.users.findUnique({ where: { email } })
  if (!user) {
    console.error(`Không có tài khoản nào với email ${email} — tạo tài khoản trước (đăng ký thường, hoặc \`them-thanh-vien\`).`)
    process.exit(1)
  }

  const result = await grantPlatformOperator(user, capabilityCodes, grantedBy)

  console.log(`Đã gán quyền vận hành nền tảng cho ${email} (user_id=${user.id}, operator_id=${result.operatorId}).`)
  console.log(`Năng lực: ${capabilityCodes.join(", ")}`)
  if (result.approved) console.log("Tài khoản đang chờ duyệt đăng ký → đã duyệt, đăng nhập được ngay.")
  if (result.temporaryPassword) console.log(`Tài khoản dùng thử không có mật khẩu — mật khẩu tạm (đổi ngay khi đăng nhập): ${result.temporaryPassword}`)

  await prisma.$disconnect()
}

main().catch(async (loi) => {
  console.error(loi)
  await prisma.$disconnect()
  process.exit(1)
})
