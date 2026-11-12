/**
 * Bộ kiểm tra dữ liệu sau khôi phục (ADR-015 D-O3, diễn tập O-7 / S-4) — chạy ở CSDL khôi phục rồi ở production, so hai
 * bản in: `npm run db:verify`. Chỉ đọc, không in dữ liệu cá nhân: phiên bản schema, số dòng các bảng chính, đơn mới nhất,
 * tổng đã thu, số đơn lệch sổ thu (ADR-013 D-I6). Ghi kết quả vào biên bản diễn tập.
 */
import { prisma } from "@/core/tenancy/infra/prisma"
import { asSystemDb } from "@/core/tenancy/db-context"
import { schemaVersion } from "@/modules/organization/infra/tenant-transfer-sources"
import { PaymentReconciliationRepository } from "@/modules/orders/infra/payment-reconciliation-repository"

const TABLES = ["organizations", "users", "customers", "products", "orders", "order_items", "order_payments", "audit_logs"] as const

async function main() {
  console.log(`schema\t${await schemaVersion()}`)
  for (const t of TABLES) {
    const [row] = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "${t}"`)
    console.log(`${t}\t${row?.n ?? 0}`)
  }
  const [latest] = await prisma.$queryRawUnsafe<Array<{ at: Date | null; paid: string | null }>>(
    `SELECT max(created_at) AS at, sum(paid_vnd)::text AS paid FROM "orders"`)
  console.log(`đơn mới nhất\t${latest?.at?.toISOString() ?? "—"}`)
  console.log(`tổng đã thu (VND)\t${latest?.paid ?? "0"}`)
  const mismatches = await new PaymentReconciliationRepository().findPaidMismatches()
  console.log(`đơn lệch sổ thu\t${mismatches.length}`)
}

asSystemDb("script:db-verify", main).then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
