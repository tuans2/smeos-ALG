import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * Danh mục ngành (`industries`) cho database test. Database test dựng bằng `prisma db push` (CI và
 * `npm run db:test:setup`) nên có bảng nhưng KHÔNG có 7 dòng seed của migration `*_industries` (ADR-012 T-6a).
 * Từ T-6c-1 mọi đường tạo tổ chức ghi thẳng `organizations.industry_key` (khoá ngoại) → thiếu seed thì mọi
 * `createTenant` vỡ khoá ngoại `organizations_industry_key_fkey` (CI #161: 411 ca đỏ cùng một lỗi).
 *
 * Đọc đúng câu `INSERT` trong tệp migration, để danh mục test không lệch production. `industries` là bảng nền
 * (không bị TRUNCATE ở `resetDatabase`), nên mỗi tiến trình chỉ cần nạp một lần.
 */
let seeded = false

export function industriesSeedSql(): string {
  const dir = path.join(process.cwd(), "prisma/migrations")
  const migration = readdirSync(dir).find((d) => d.endsWith("_industries"))
  if (!migration) throw new Error("Không thấy migration industries")
  const sql = readFileSync(path.join(dir, migration, "migration.sql"), "utf8")
  const seed = sql.match(/INSERT INTO "industries"[\s\S]*?DO NOTHING;/)?.[0]
  if (!seed) throw new Error("Migration industries thiếu câu seed")
  return seed
}

export async function ensureIndustries(): Promise<void> {
  if (seeded) return
  await prisma.$executeRawUnsafe(industriesSeedSql())
  seeded = true
}
