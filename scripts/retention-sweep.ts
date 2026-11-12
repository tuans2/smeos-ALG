/**
 * Hạn lưu theo loại dữ liệu (ADR-014 D-P4, bước P-6a) — Render shell của smeos-web:
 *   npm run retention:sweep                          (chạy thử: chỉ đếm số dòng quá hạn, không ghi gì)
 *   npm run retention:sweep -- --category audit_logs (chỉ một loại)
 *   npm run retention:sweep -- --run                 (chạy như job đêm: loại nào bật `enforce` thì xoá / ẩn danh thật)
 * Mốc và cờ ở bảng `retention_policies`. Bỏ qua tổ chức đang legal hold. Không in dữ liệu, chỉ in số dòng.
 */
import { asSystemDb } from "@/core/tenancy/db-context"
import { runRetentionSweep } from "@/modules/organization/use-cases/run-retention-sweep"

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const dryRun = !process.argv.includes("--run")
  const category = arg("category")
  const rows = await runRetentionSweep(new Date(), { dryRun, ...(category ? { category } : {}) })
  for (const r of rows) {
    if (r.skipped) {
      console.log(`${r.category}\tbỏ qua: ${r.skipped}`)
      continue
    }
    const verb = r.enforced ? (r.action === "DELETE" ? "đã xoá" : "đã ẩn danh") : "quá hạn"
    console.log(`${r.category}\t${verb} ${r.rows} dòng (trước ${r.cutoff?.toISOString().slice(0, 10)})`)
    for (const t of r.tables) console.log(`  ${t.table}\t${t.rows}`)
  }
  if (dryRun) console.log("chạy thử — thêm --run để chạy như job đêm (chỉ loại đã bật enforce mới xoá / ẩn danh)")
}

asSystemDb("script:retention-sweep", main).then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
