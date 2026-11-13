#!/usr/bin/env node
// Kiểm migration mới theo quy ước expand/contract (ADR-015 D-O4, bước O-5). Chạy: npm run check:migrations
//
// Chỉ kiểm migration có thời điểm SAU mốc CUTOFF — migration cũ đã chạy trên production, không sửa được.
// Một lệnh nguy hiểm được phép khi tệp có dòng chú thích lý do đã được PO duyệt:
//   -- contract: <lý do>   cho DROP COLUMN / DROP TABLE
//   -- backfill: <cách>    cho SET NOT NULL không kèm UPDATE trong cùng tệp
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

export const MIGRATIONS_DIR = "prisma/migrations"
export const CUTOFF = "20261105235959"

/** Bỏ chú thích `--` để lệnh nằm trong chú thích không bị tính. */
function sqlOnly(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
}

/** Lỗi (chặn) và cảnh báo của một tệp migration. */
export function checkMigrationSql(text) {
  const errors = []
  const warnings = []
  const sql = sqlOnly(text)
  const has = (re) => re.test(sql)
  const note = (tag) => new RegExp(`--\\s*${tag}:\\s*\\S`, "i").test(text)

  if (has(/\bDROP\s+COLUMN\b/i) && !note("contract")) errors.push("DROP COLUMN cần dòng `-- contract: <lý do>` (bước contract đã duyệt)")
  if (has(/\bDROP\s+TABLE\b/i) && !note("contract")) errors.push("DROP TABLE cần dòng `-- contract: <lý do>` (bước contract đã duyệt)")
  for (const raw of sql.split(";")) {
    const stmt = raw.replace(/"[^"]*"/g, '""') // tên định danh trong ngoặc kép (vd. cột "type") không phải từ khoá
    if (/\bALTER\s+COLUMN\b[\s\S]*\b(SET\s+DATA\s+)?TYPE\b/i.test(stmt) && !/\bUSING\b/i.test(stmt)) {
      errors.push("đổi kiểu cột phải có `USING …` (Prisma sinh DROP + ADD hoặc ép kiểu ngầm)")
    }
    if (/\bADD\s+COLUMN\b[^,]*\bNOT\s+NULL\b/i.test(stmt) && !/\bDEFAULT\b/i.test(stmt)) {
      errors.push("thêm cột NOT NULL không DEFAULT sẽ lỗi trên bảng có dữ liệu — thêm cột cho phép NULL, backfill, rồi SET NOT NULL")
    }
  }
  if (has(/\bSET\s+NOT\s+NULL\b/i) && !has(/\bUPDATE\s+"?\w+"?\s+/i) && !note("backfill")) {
    errors.push("SET NOT NULL cần UPDATE backfill trong cùng tệp hoặc dòng `-- backfill: <cách>`")
  }
  if (has(/\b(ALTER\s+TABLE|CREATE\s+(UNIQUE\s+)?INDEX)\b/i) && !has(/\block_timeout\b/i)) {
    warnings.push("nên đặt `SET LOCAL lock_timeout` để migration dừng thay vì treo khi bảng bận")
  }
  return { errors: [...new Set(errors)], warnings }
}

export function checkMigrationsDir(dir = MIGRATIONS_DIR, cutoff = CUTOFF) {
  const results = []
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name, "migration.sql")
    if (name <= cutoff || !existsSync(file)) continue
    results.push({ name, ...checkMigrationSql(readFileSync(file, "utf8")) })
  }
  return results
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = checkMigrationsDir()
  let failed = 0
  for (const r of results) {
    for (const w of r.warnings) console.warn(`⚠ ${r.name}: ${w}`)
    for (const e of r.errors) console.error(`✗ ${r.name}: ${e}`)
    if (r.errors.length) failed += 1
  }
  if (failed) {
    console.error(`✗ ${failed} migration vi phạm quy ước expand/contract (ADR-015 D-O4).`)
    process.exit(1)
  }
  console.log(`✓ ${results.length} migration mới sau mốc ${CUTOFF} đạt quy ước expand/contract.`)
}
