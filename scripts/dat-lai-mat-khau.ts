/**
 * Đặt lại mật khẩu của một tài khoản — CÔNG CỤ PHÁT TRIỂN CỤC BỘ.
 *
 * Lý do tồn tại: `bootstrapAviGiftOrganization` (P8) sinh mật khẩu tạm ngẫu
 * nhiên và IN RA ĐÚNG MỘT LẦN lúc chạy `npm run nap:danh-muc`. Mất dòng đó là
 * mất đường đăng nhập vào tổ chức AVI GIFT trên máy phát triển, mà tổ chức ấy
 * lại là nơi duy nhất có dữ liệu thật để thử luồng đầu-cuối.
 *
 * Không phải luồng "quên mật khẩu" cho người dùng cuối: nó không gửi thư, không
 * sinh token có hạn, không kiểm quyền — nó ghi thẳng `password_hash`, nên chỉ
 * chạy được bởi người đã cầm chuỗi kết nối cơ sở dữ liệu. Luồng khôi phục thật
 * (`YC-S*`) thuộc P12, không phải tệp này.
 *
 *   npm run mat-khau -- --email=ai@do.com --password=<mật khẩu mới>
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

  if (!emailTho || !matKhau) {
    console.error("Dùng: npm run mat-khau -- --email=<địa chỉ thư> --password=<mật khẩu mới>")
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

  const nguoiDung = await prisma.users.findUnique({ where: { email } })
  if (!nguoiDung) {
    console.error(`Không có tài khoản nào với địa chỉ thư ${email}`)
    process.exit(1)
  }

  await prisma.users.update({
    where: { id: nguoiDung.id },
    data: { password_hash: await hashPassword(matKhau) },
  })

  // Phiên cũ thu hồi hết: đổi mật khẩu mà để phiên cũ sống tiếp thì việc đổi
  // mất phần lớn ý nghĩa của nó.
  const thuHoi = await prisma.sessions.updateMany({
    where: { user_id: nguoiDung.id, revoked_at: null },
    data: { revoked_at: new Date() },
  })

  console.log(`Đã đổi mật khẩu cho ${email}`)
  console.log(`Thu hồi ${thuHoi.count} phiên đang mở`)
  await prisma.$disconnect()
}

main().catch(async (loi) => {
  console.error(loi)
  await prisma.$disconnect()
  process.exit(1)
})
