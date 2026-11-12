import { prisma } from "@/core/tenancy/infra/prisma"
import { QA_ORGANIZATION_NAME, createQaAccounts, qaAccountsProblems } from "@/modules/platform/infra/qa-accounts"

/**
 * Tạo hai tài khoản chuyên test chức năng trong tổ chức riêng "ALG QA" (PO 22/10/2026):
 * test01 = Điều hành (toàn quyền tiệm), test02 = vai hạn chế (mặc định Sale). Không cấp mã N.
 * Chạy SAU `npm run don-tai-khoan` — lệnh đó xoá mọi tài khoản trừ superadmin.
 *
 *   MAT_KHAU_TEST01='…' MAT_KHAU_TEST02='…' npm run tao-tai-khoan-test            # chỉ kiểm tra
 *   MAT_KHAU_TEST01='…' MAT_KHAU_TEST02='…' npm run tao-tai-khoan-test -- --xac-nhan
 *
 * Tuỳ chọn: --chu=<email> (mặc định test01@avilotusgroup.com), --nhan-vien=<email> (test02@avilotusgroup.com),
 * --vai=<sale|dieu_phoi|…>. Mật khẩu đọc từ biến môi trường để không nằm trong tham số dòng lệnh.
 */
function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3).trim()
}

async function main(): Promise<void> {
  const input = {
    ownerEmail: arg("chu") ?? "test01@avilotusgroup.com",
    staffEmail: arg("nhan-vien") ?? "test02@avilotusgroup.com",
    staffRoleKey: arg("vai") ?? "sale",
    ownerPassword: process.env.MAT_KHAU_TEST01 ?? "",
    staffPassword: process.env.MAT_KHAU_TEST02 ?? "",
  }
  const apply = process.argv.includes("--xac-nhan")
  console.log(`CSDL: ${new URL(process.env.DATABASE_URL ?? "postgresql://x/(không rõ)").pathname.slice(1)}`)
  console.log(`Tổ chức mới: ${QA_ORGANIZATION_NAME}`)
  console.log(`  ${input.ownerEmail} → Điều hành`)
  console.log(`  ${input.staffEmail} → ${input.staffRoleKey}`)

  const problems = await qaAccountsProblems(input)
  if (problems.length > 0) {
    for (const p of problems) console.error(`  ✗ ${p}`)
    process.exitCode = 1
    return
  }
  if (!apply) {
    console.log("\nKiểm tra đạt. Chưa tạo gì — thêm --xac-nhan để tạo thật.")
    return
  }
  const result = await createQaAccounts(input)
  console.log(`\nĐã tạo. Mã tổ chức: ${result.organizationId}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => void prisma.$disconnect())
