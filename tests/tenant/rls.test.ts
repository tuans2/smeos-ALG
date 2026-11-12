import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"
import { RlsPool, setRlsAuditSink, type RlsAuditEvent, type RlsMode } from "@/core/tenancy/infra/rls-pool"
import { asSystemDb, runWithDbContext, withTenantDb } from "@/core/tenancy/db-context"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Checklist ALG 1.18, ADR-013 D-I2/D-I3 — Row Level Security theo tổ chức. Client riêng trỏ cùng CSDL test, pool
 * đặt `app.org_id` theo ngữ cảnh của luồng. Chế độ chặn: thiếu ngữ cảnh → 0 dòng; tổ chức A không đọc/ghi được
 * dòng của B kể cả khi truy vấn quên lọc; quyền hệ thống thấy tất cả; kết nối dùng lại không rò ngữ cảnh.
 */
/** Tài khoản thường (như `alg_app`, ADR-013 D-I1): superuser của CSDL test bỏ qua RLS nên không dùng được để kiểm. */
const APP_ROLE = "alg_app_rls_test"
const APP_PASSWORD = "chi-dung-cho-test-rls"

function appUrl(): string {
  const url = new URL(process.env.DATABASE_URL!)
  url.username = APP_ROLE
  url.password = APP_PASSWORD
  return url.toString()
}

/**
 * CSDL test dựng bằng `prisma db push` (CI, `npm run db:test:setup`) không chạy migration — áp đúng SQL của
 * migration RLS khi chưa có chính sách. Chính sách chỉ chặn khi phiên bật `enforce`, test khác không bị ảnh hưởng.
 */
async function ensureRlsPolicies(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`SELECT count(*)::bigint AS n FROM pg_policies WHERE policyname = 'tenant_isolation'`
  if (Number(rows[0]?.n ?? 0) > 0) return
  const dir = path.join(__dirname, "../../prisma/migrations")
  const migration = readdirSync(dir).find((d) => d.endsWith("_row_level_security"))
  if (!migration) throw new Error("Không thấy migration row_level_security")
  const sql = readFileSync(path.join(dir, migration, "migration.sql"), "utf8")
  for (const stmt of sql.split(/;\s*\n/).map((x) => x.replace(/^--.*$/gm, "").trim()).filter(Boolean)) {
    // Bảng đã xoá ở migration contract sau đó (vd. chain_branches — ADR-012 T-4c) không có trong CSDL dựng bằng db push
    const table = stmt.match(/(?:ALTER TABLE|ON) "([a-z0-9_]+)"/)?.[1]
    if (table) {
      const found = await prisma.$queryRawUnsafe<Array<{ t: string | null }>>(`SELECT to_regclass('public."${table}"')::text AS t`)
      if (!found[0]?.t) continue
    }
    await prisma.$executeRawUnsafe(stmt)
  }
}

async function ensureAppRole(): Promise<void> {
  await prisma.$executeRawUnsafe(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
      CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER NOBYPASSRLS;
    END IF;
  END $$`)
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`)
  await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`)
}

function clientFor(mode: RlsMode): PrismaClient {
  const pool = new RlsPool({ connectionString: appUrl(), max: 1, application_name: "smeos-rls-test" }, mode)
  return new PrismaClient({ adapter: new PrismaPg(pool) })
}

describe("Row Level Security theo tổ chức", () => {
  let a: Tenant
  let b: Tenant
  let enforce: PrismaClient
  let audit: PrismaClient
  const events: RlsAuditEvent[] = []

  beforeAll(async () => {
    await ensureRlsPolicies()
    await ensureAppRole()
    enforce = clientFor("enforce")
    audit = clientFor("audit")
  })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("rls-a")
    b = await createTenant("rls-b")
    await prisma.customers.createMany({ data: [
      { organization_id: a.organizationId, code: "KH-A", name: "Khách A", phone: "0900000001" },
      { organization_id: b.organizationId, code: "KH-B", name: "Khách B", phone: "0900000002" },
    ] })
    events.length = 0
    setRlsAuditSink((e) => events.push(e))
  })
  afterEach(() => setRlsAuditSink(null))
  afterAll(async () => {
    await Promise.all([enforce.$disconnect(), audit.$disconnect()])
    await disconnectDatabase()
  })

  it("chặn: request chưa gắn tổ chức đọc bảng thuộc tổ chức → 0 dòng", async () => {
    const rows = await runWithDbContext({ kind: "pending", route: "/api/v1/thu" }, () => enforce.customers.findMany())
    expect(rows).toEqual([])
  })

  it("chặn: tổ chức A quên lọc vẫn chỉ thấy dòng của A; SQL thô cũng vậy; không ghi được dòng cho B", async () => {
    const names = await withTenantDb(a.organizationId, () => enforce.customers.findMany({ select: { name: true } }))
    expect(names.map((c) => c.name)).toEqual(["Khách A"])
    const raw = await withTenantDb(a.organizationId, () => enforce.$queryRaw<Array<{ n: bigint }>>`SELECT count(*)::bigint AS n FROM customers`)
    expect(Number(raw[0]!.n)).toBe(1)
    await expect(withTenantDb(a.organizationId, () =>
      enforce.customers.create({ data: { organization_id: b.organizationId, code: "KH-X", name: "Ghi lén", phone: "0900000003" } }),
    )).rejects.toThrow()
    const updated = await withTenantDb(a.organizationId, () => enforce.customers.updateMany({ where: { name: "Khách B" }, data: { name: "Sửa lén" } }))
    expect(updated.count).toBe(0)
  })

  it("chặn: giao dịch giữ đúng tổ chức; kết nối dùng lại cho request khác không mang theo tổ chức cũ", async () => {
    const inTx = await withTenantDb(b.organizationId, () => enforce.$transaction(async (tx) => tx.customers.count()))
    expect(inTx).toBe(1)
    // pool chỉ một kết nối — cùng kết nối vừa đặt tổ chức B
    expect(await runWithDbContext({ kind: "pending" }, () => enforce.customers.count())).toBe(0)
    expect(await withTenantDb(a.organizationId, () => enforce.customers.count())).toBe(1)
  })

  it("quyền hệ thống thấy mọi tổ chức (bộ quét nền, trang công khai tra theo mã)", async () => {
    expect(await asSystemDb("test", () => enforce.customers.count())).toBe(2)
  })

  it("ghi nhận: không chặn, nhưng báo truy vấn lẽ ra bị chặn kèm bảng và đường dẫn", async () => {
    const rows = await runWithDbContext({ kind: "pending", route: "/api/v1/thu" }, () => audit.customers.findMany())
    expect(rows).toHaveLength(2)
    expect(events).toContainEqual({ kind: "pending", tables: ["customers"], route: "/api/v1/thu" })
    events.length = 0
    await withTenantDb(a.organizationId, () => audit.customers.findMany())
    await asSystemDb("test", () => audit.customers.findMany())
    expect(events).toEqual([])
  })
})
