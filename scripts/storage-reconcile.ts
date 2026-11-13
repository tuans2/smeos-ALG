import { prisma } from "../src/core/tenancy/infra/prisma"
import { organizationOfKey } from "../src/modules/assets/domain/storage-reconciliation"
import { reconcileStorageRegistry } from "../src/modules/assets/use-cases/reconcile-storage"

// SDAGF P2 — đối soát registry ↔ kho tệp, CHỈ ĐỌC (không xoá, không sửa).
//
//   npm run storage:reconcile            # tóm tắt theo tổ chức
//   npm run storage:reconcile -- --json  # toàn bộ báo cáo dạng JSON
//
// Khoá kho chỉ gồm id tổ chức/sản phẩm/asset (UUID), không chứa dữ liệu khách.
const SAMPLE = 20

async function main(): Promise<void> {
  const report = await reconcileStorageRegistry()
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  const byOrg = new Map<string, { orphans: number; orphanBytes: number; missing: number }>()
  const row = (org: string) => byOrg.get(org) ?? byOrg.set(org, { orphans: 0, orphanBytes: 0, missing: 0 }).get(org)!
  for (const o of report.orphans) {
    const r = row(organizationOfKey(o.key) ?? "?")
    r.orphans += 1
    r.orphanBytes += o.size
  }
  for (const key of report.missing) row(organizationOfKey(key) ?? "?").missing += 1

  console.log(`Tệp trên kho: ${report.storedCount} (${report.storedBytes} byte)`)
  console.log(`Khoá registry: ${report.registryCount} · đang chờ xoá: ${report.pendingDeleteCount}`)
  console.log(`Tệp mồ côi: ${report.orphans.length} (${report.orphanBytes} byte) · bản ghi thiếu tệp: ${report.missing.length}`)
  console.table([...byOrg].map(([organization, r]) => ({ organization, ...r })))
  if (report.orphans.length) console.log("Mẫu tệp mồ côi:", report.orphans.slice(0, SAMPLE).map((o) => o.key))
  if (report.missing.length) console.log("Mẫu bản ghi thiếu tệp:", report.missing.slice(0, SAMPLE))
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
