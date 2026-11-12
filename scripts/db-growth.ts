/**
 * Đo tăng trưởng bảng (ADR-015 D-O6, bước O-10) — Render shell của smeos-web: `npm run db:growth`.
 * In 10 bảng lớn nhất và bảng chạm ngưỡng (≥ 70% của 20 triệu dòng / 10 GB). Chỉ đọc. Bảng "xét phân vùng" → làm theo
 * runbook §18 (đề xuất migration SQL tay, PO duyệt); báo cáo chậm (p95 > 2 s) → cân nhắc bản sao đọc.
 */
import { growthFindings } from "@/core/runtime/db-growth"
import { readTableSizes } from "@/core/runtime/infra/table-sizes"
import { asSystemDb } from "@/core/tenancy/db-context"

const fmt = (bytes: number) => `${(bytes / 1024 ** 2).toFixed(1)} MB`

async function main() {
  const sizes = await readTableSizes()
  for (const t of sizes.slice(0, 10)) console.log(`${t.table}\t${t.rows} dòng\t${fmt(t.bytes)}`)
  const findings = growthFindings(sizes)
  if (findings.length === 0) return console.log("không bảng nào chạm ngưỡng phân vùng")
  for (const f of findings) console.log(`${f.level === "partition" ? "XÉT PHÂN VÙNG" : "theo dõi"}\t${f.table}\t${f.rows} dòng\t${fmt(f.bytes)}`)
}

asSystemDb("script:db-growth", main).then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
