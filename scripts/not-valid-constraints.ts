/**
 * Khoá `NOT VALID` còn sót (VAN_HANH_CAP_NHAT_CSDL.md §7) — Render shell của smeos-web: `npm run db:not-valid`.
 * Mặc định chỉ đọc: in từng khoá và số dòng vi phạm (không in dữ liệu). `-- --validate`: VALIDATE các khoá đã sạch
 * (sau khi người vận hành dọn dòng sai). Không sửa hay xoá dòng nào.
 */
import { asSystemDb } from "@/core/tenancy/db-context"
import { listNotValidConstraints, validateCleanConstraints } from "@/core/runtime/infra/not-valid-constraints"

async function main() {
  if (process.argv.includes("--validate")) {
    const done = await asSystemDb("script:not-valid-constraints", () => validateCleanConstraints())
    console.log(`đã VALIDATE ${done.length} khoá${done.length ? `: ${done.join(", ")}` : ""}`)
  }
  const left = await asSystemDb("script:not-valid-constraints", () => listNotValidConstraints())
  if (left.length === 0) return console.log("không còn khoá NOT VALID")
  for (const c of left) console.log(`${c.table}\t${c.name}\t${c.kind}\t${c.violations} dòng vi phạm`)
  console.log(`còn ${left.length} khoá NOT VALID`)
}

main().then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
