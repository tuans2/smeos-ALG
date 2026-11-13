import { prisma } from "@/core/tenancy/infra/prisma"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"

/**
 * Nạp credit cho một tổ chức. Thao tác của NGƯỜI VẬN HÀNH NỀN TẢNG — chạy
 * tay trên máy có quyền truy cập cơ sở dữ liệu, không qua HTTP.
 *
 *   npm run nap:credit -- --org-id=<uuid> --amount=<số nguyên dương>
 *   npm run nap:credit -- --list          # xem số dư mọi tổ chức
 *
 * Dùng `npm run` chứ không `npx tsx` trực tiếp: script npm mang theo cờ
 * `--env-file-if-exists=.env` (xem `package.json`). Chạy thẳng `npx tsx` sẽ
 * ném ngay ở `src/lib/env.ts` vì không biến môi trường nào được nạp.
 *
 * Vì sao là script chứ không phải endpoint (chốt với anh Tony 09/10): mở
 * endpoint đòi một mã năng lực "quản trị nền tảng" mà bộ 114 mã chưa có, và
 * đòi một khái niệm quản trị đứng NGOÀI mọi tổ chức mà đặc tả chưa định
 * nghĩa. Cả hai là thay đổi kiến trúc, không phải việc mở khoá vận hành.
 *
 * Vì sao cần: `bootstrapAviGiftOrganization` (P8) dựng tổ chức với
 * `credit_balance = 0` và workspace `PRODUCTION`. Workspace không phải
 * `EXPERIENCE` thì `fundingSourceForWorkspace` trả `"credit"`, nên MỌI
 * `enqueueJob` bị `tryDeductCredit` chặn ở `quotaExceeded("Không đủ credit")`
 * cho tới khi có người nạp. Không có script này thì đường duy nhất là sửa
 * tay bằng SQL.
 */

function argValue(name: string): string | null {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : null
}

async function listBalances(): Promise<void> {
  const organizations = await prisma.organizations.findMany({
    orderBy: { created_at: "asc" },
    select: { id: true, name: true, slug: true, type: true, credit_balance: true },
  })
  if (organizations.length === 0) {
    console.log("Chưa có tổ chức nào.")
    return
  }
  console.log("Số dư credit theo tổ chức:")
  for (const organization of organizations) {
    console.log(
      `  ${organization.id}  ${String(organization.credit_balance).padStart(8)}  ` +
        `${organization.type.padEnd(8)}  ${organization.name} (${organization.slug})`
    )
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--list")) {
    await listBalances()
    return
  }

  const organizationId = argValue("org-id")
  const amountRaw = argValue("amount")

  if (!organizationId || !amountRaw) {
    console.error("Dùng: npm run nap:credit -- --org-id=<uuid> --amount=<số nguyên dương>")
    console.error("      npm run nap:credit -- --list")
    process.exitCode = 1
    return
  }

  const amount = Number(amountRaw)
  if (!Number.isInteger(amount) || amount <= 0) {
    console.error(`--amount phải là số nguyên dương, nhận được: ${amountRaw}`)
    process.exitCode = 1
    return
  }

  const repository = new OrganizationRepository()
  const before = await prisma.organizations.findUnique({
    where: { id: organizationId },
    select: { name: true, credit_balance: true },
  })
  if (!before) {
    console.error(`Không có tổ chức nào mang id ${organizationId}. Chạy --list để xem danh sách.`)
    process.exitCode = 1
    return
  }

  const balance = await repository.topUpCredit(organizationId, amount, "TOPUP", { reason: "Nạp qua script vận hành" })
  console.log(
    `${before.name}: ${before.credit_balance} + ${amount} = ${balance} credit`
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
