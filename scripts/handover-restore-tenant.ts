/**
 * QUY TRÌNH PHỤC HỒI DỮ LIỆU BÀN GIAO (HANDOVER DISASTER RECOVERY PIPELINE)
 *
 * Dùng khi cần khôi phục lại dữ liệu đã bị xóa nhầm trong quá trình bàn giao.
 *
 * Cách dùng:
 *   • Local: npm run handover:restore -- --file=backups/snapshot-siin-store-xxx.json --confirm
 *   • Prod:  npm run handover:restore:prod -- --file=backups/snapshot-siin-store-xxx.json --confirm
 */

import path from "node:path"
import { prisma } from "../src/core/tenancy/infra/prisma"
import { restoreTenantHandoverBackup } from "./handover-backup-engine"

function getArg(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  return found ? found.slice(name.length + 3) : null
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

async function main(): Promise<void> {
  console.log("================================================================================")
  console.log("🚑 [ALG] KHỞI ĐỘNG QUY TRÌNH KHÔI PHỤC DỮ LIỆU (DISASTER RECOVERY)")
  console.log("================================================================================")

  const filePath = getArg("file")
  const confirm = hasFlag("confirm") || hasFlag("force")

  if (!filePath) {
    console.error("❌ LỖI: Vui lòng chỉ định file sao lưu bằng cờ --file=<đường-dẫn-file>")
    process.exit(1)
  }

  if (!confirm) {
    console.error("⚠️  CẢNH BÁO: Thao tác này sẽ nạp lại dữ liệu từ bản sao lưu vào CSDL.")
    console.error(`   👉 Thêm cờ --confirm để thực thi: npm run handover:restore -- --file=${filePath} --confirm\n`)
    process.exit(1)
  }

  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
  console.log(`📂 Đang khôi phục từ tệp: \x1b[36m${resolvedPath}\x1b[0m`)

  const result = await restoreTenantHandoverBackup(prisma, resolvedPath)

  console.log("\n✅ [KHÔI PHỤC HOÀN TẤT THÀNH CÔNG]")
  console.log(`   • Đơn hàng đã phục hồi:   ${result.restoredOrders}`)
  console.log(`   • Phiên thiệp đã phục hồi: ${result.restoredSessions}`)
  console.log("================================================================================\n")
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("❌ [LỖI KHÔI PHỤC]:", err)
    await prisma.$disconnect()
    process.exit(1)
  })
