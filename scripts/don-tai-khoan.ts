import { prisma } from "@/core/tenancy/infra/prisma"
import { applyAccountCleanup, planAccountCleanup } from "@/modules/platform/infra/account-cleanup"

/**
 * Xoá HẲN mọi tài khoản trừ một, rồi cấp cho tài khoản đó đủ mã vận hành nền tảng (N1–N8, N12)
 * — PO 22/10/2026, trước khi bàn giao. Không hoàn tác được: tạo export CSDL trước khi chạy.
 *
 *   npm run don-tai-khoan -- --giu=tuans2@dev.com                # chỉ xem sẽ xoá gì
 *   MAT_KHAU_MOI='…' npm run don-tai-khoan -- --giu=tuans2@dev.com --xac-nhan
 *
 * `MAT_KHAU_MOI` (≥ 12 ký tự) đổi mật khẩu tài khoản giữ lại và đăng xuất phiên cũ của nó. Đọc từ
 * biến môi trường để mật khẩu không nằm trong tham số dòng lệnh. Quy trình: docs/kien-truc/HO_SO_BAN_GIAO.md.
 */
async function main(): Promise<void> {
  const keepEmail = process.argv.find((a) => a.startsWith("--giu="))?.slice("--giu=".length).trim()
  if (!keepEmail) throw new Error("Thiếu --giu=<địa chỉ thư của tài khoản giữ lại>")
  const apply = process.argv.includes("--xac-nhan")
  const newPassword = process.env.MAT_KHAU_MOI || undefined

  const dbName = new URL(process.env.DATABASE_URL ?? "postgresql://x/(không rõ)").pathname.slice(1)
  console.log(`CSDL: ${dbName}`)
  const plan = await planAccountCleanup(keepEmail)
  console.log(`Giữ lại: ${plan.keep.email} → superadmin nền tảng (đủ mã N)`)
  console.log(`${apply ? "Xoá" : "Sẽ xoá"} ${plan.remove.length} tài khoản:`)
  for (const u of plan.remove) console.log(`  - ${u.email}`)
  if (plan.orphanedOrganizations.length > 0) {
    console.log(`${plan.orphanedOrganizations.length} tổ chức sẽ không còn thành viên (KHÔNG bị xoá):`)
    for (const o of plan.orphanedOrganizations) console.log(`  - ${o.name} (${o.id})`)
  }
  if (!apply) {
    console.log("\nChưa thay đổi gì. Thêm --xac-nhan để xoá thật.")
    return
  }
  await applyAccountCleanup(plan, newPassword)
  console.log(`\nXong. Đã xoá ${plan.remove.length} tài khoản, đã cấp đủ mã N cho ${plan.keep.email}.`)
  if (!newPassword) {
    console.log("CHÚ Ý: chưa đổi mật khẩu — mật khẩu cũ có trong lịch sử repo công khai. Chạy lại với MAT_KHAU_MOI.")
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => void prisma.$disconnect())
