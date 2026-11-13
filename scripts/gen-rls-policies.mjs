#!/usr/bin/env node
// Sinh SQL bật Row Level Security cho các bảng thuộc tổ chức chưa có chính sách (ADR-013 D-I2, checklist ALG 1.18).
// Danh sách bảng đọc từ sổ bảng-thuộc-tenant (src/core/tenancy/generated/tenant-table-registry.ts), không gõ tay.
// Dùng: node scripts/gen-rls-policies.mjs > prisma/migrations/<tên>/migration.sql
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const registry = readFileSync(path.join(ROOT, "src/core/tenancy/generated/tenant-table-registry.ts"), "utf8")
const block = registry.slice(registry.indexOf("export const TENANT_SCOPED_TABLES"))
const tenantTables = [...block.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1])

const migrationsDir = path.join(ROOT, "prisma/migrations")
const covered = new Set()
for (const dir of readdirSync(migrationsDir)) {
  let sql = ""
  try { sql = readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8") } catch { continue }
  for (const m of sql.matchAll(/CREATE POLICY tenant_isolation ON "([a-z0-9_]+)"/g)) covered.add(m[1])
}

// `(SELECT current_setting(…))` để PostgreSQL tính một lần mỗi truy vấn (initplan), không tính lại trên từng dòng
export const RLS_PREDICATE = [
  "(SELECT current_setting('app.rls_mode', true)) IS DISTINCT FROM 'enforce'",
  "(SELECT current_setting('app.rls_system', true)) = 'on'",
  "organization_id = (SELECT current_setting('app.org_id', true))",
].join("\n    OR ")

const missing = tenantTables.filter((t) => !covered.has(t))
const out = [
  "-- Row Level Security theo tổ chức (ADR-013 D-I2, checklist ALG 1.18). Sinh bởi scripts/gen-rls-policies.mjs.",
  "-- Chặn chỉ khi phiên đặt app.rls_mode = 'enforce' (pool web đặt theo DB_RLS_MODE); quyền hệ thống đặt app.rls_system = 'on'.",
  "SET lock_timeout = '5s';",
  "",
]
for (const t of missing) {
  out.push(
    `ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE "${t}" FORCE ROW LEVEL SECURITY;`,
    `CREATE POLICY tenant_isolation ON "${t}"`,
    `  USING (\n    ${RLS_PREDICATE}\n  )`,
    `  WITH CHECK (\n    ${RLS_PREDICATE}\n  );`,
    "",
  )
}
process.stdout.write(missing.length ? out.join("\n") : "-- Mọi bảng thuộc tổ chức đã có chính sách RLS.\n")
