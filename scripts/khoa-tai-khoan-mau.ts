import { randomBytes } from "node:crypto"

import { prisma } from "@/core/tenancy/infra/prisma"
import { hashPassword } from "@/modules/organization/infra/password-hasher"

/**
 * Khoá hai tài khoản mẫu của tổ chức "Tiệm Hoa Mộc Lan (Dev)" trên MÁY CHỦ THẬT (PO 08/10/2026).
 * Mật khẩu của hai tài khoản này nằm công khai trong `prisma/seed/dev-shop-moclan.ts`; trước đây mỗi lần
 * triển khai còn được nạp lại. Script: đặt mật khẩu ngẫu nhiên (không ai biết), tạm khoá thành viên,
 * đăng xuất mọi phiên. KHÔNG xoá dữ liệu — dữ liệu mẫu nằm riêng một tổ chức, tiệm thật không thấy.
 *
 *   npm run khoa:tai-khoan-mau              # chỉ xem sẽ khoá gì
 *   npm run khoa:tai-khoan-mau -- --xac-nhan
 *
 * Chạy SAU khi bản triển khai có `SEED_DEV_DATA="false"` đã lên (nếu không, lần triển khai sau nạp lại).
 */
const DEMO_EMAILS = ["moclan@dev.vn", "owner@moclan.local"]

async function main(): Promise<void> {
  const apply = process.argv.includes("--xac-nhan")
  const users = await prisma.users.findMany({ where: { email: { in: DEMO_EMAILS } }, select: { id: true, email: true } })
  if (users.length === 0) {
    console.log("Không có tài khoản mẫu nào trên cơ sở dữ liệu này — không cần làm gì.")
    return
  }
  for (const u of users) {
    const memberships = await prisma.memberships.count({ where: { user_id: u.id } })
    console.log(`${apply ? "Khoá" : "Sẽ khoá"}: ${u.email} (${memberships} tư cách thành viên)`)
    if (!apply) continue
    const hash = await hashPassword(randomBytes(24).toString("base64url"))
    const now = new Date()
    await prisma.$transaction([
      prisma.users.update({ where: { id: u.id }, data: { password_hash: hash } }),
      prisma.memberships.updateMany({ where: { user_id: u.id }, data: { status: "SUSPENDED" } }),
      prisma.sessions.updateMany({ where: { user_id: u.id, revoked_at: null }, data: { revoked_at: now } }),
    ])
  }
  if (!apply) console.log("\nChưa thay đổi gì. Thêm --xac-nhan để khoá thật.")
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => void prisma.$disconnect())
