/**
 * ADR-013 I-4 — đo độ trễ truy vấn của pool đặt ngữ cảnh RLS (`RlsPool`) ở ba chế độ `off` / `audit` / `enforce`.
 *
 * Chạy trên một CSDL `*_test` dựng bằng `prisma migrate deploy` (có đủ chính sách RLS), KHÔNG chạy trên production:
 *   DATABASE_URL=postgresql://…/floraos_bench_test npx tsx scripts/bench-rls.ts [--orgs 20] [--ops 3000] [--concurrency 8]
 * Script tạo một tài khoản thường (superuser bỏ qua RLS), nạp dữ liệu giả cho nhiều tổ chức, rồi đo cùng một tập
 * truy vấn (danh sách đơn, chi tiết đơn, danh sách sản phẩm, đếm khách, một giao dịch) theo từng chế độ, xen kẽ
 * nhiều vòng để giảm nhiễu. Mỗi thao tác chọn ngẫu nhiên một tổ chức nên pool phải đổi ngữ cảnh thường xuyên.
 * In p50 / p95 / p99 (ms) và kiểm số dòng trả về như nhau ở mọi chế độ.
 */
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"
import { withTenantDb } from "@/core/tenancy/db-context"
import { RlsPool, setRlsAuditSink, type RlsMode } from "@/core/tenancy/infra/rls-pool"

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? Number(process.argv[i + 1]) : fallback
}
const ORGS = arg("orgs", 20)
const OPS = arg("ops", 3000)
const CONCURRENCY = arg("concurrency", 8)
const ROUNDS = arg("rounds", 3)
const MODES: RlsMode[] = ["off", "audit", "enforce"]
const ROLE = "smeos_app_bench"
const PASSWORD = "chi-dung-cho-do-rls"

const url = process.env["DATABASE_URL"] ?? ""
const dbName = new URL(url).pathname.slice(1)
if (!dbName.endsWith("_test")) throw new Error(`Chỉ chạy trên CSDL *_test (đang là "${dbName}")`)

const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

async function setup(): Promise<string[]> {
  const policies = await owner.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM pg_policies WHERE policyname = 'tenant_isolation'`)
  if ((policies[0]?.n ?? 0) === 0) throw new Error("CSDL chưa có chính sách RLS — dựng bằng `prisma migrate deploy`")
  await owner.$executeRawUnsafe(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROLE}') THEN CREATE ROLE ${ROLE} LOGIN PASSWORD '${PASSWORD}'; END IF;
  END $$`)
  await owner.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${ROLE}`)
  await owner.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`)

  const existing = await owner.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM organizations WHERE slug LIKE 'bench-%' ORDER BY slug`)
  if (existing.length >= ORGS) return existing.slice(0, ORGS).map((o) => o.id)
  await owner.$executeRawUnsafe(`
    INSERT INTO organizations (id, name, slug, updated_at)
    SELECT gen_random_uuid()::text, 'Bench ' || g, 'bench-' || lpad(g::text, 3, '0'), now() FROM generate_series(1, ${ORGS}) g
    ON CONFLICT (slug) DO NOTHING`)
  const orgs = await owner.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM organizations WHERE slug LIKE 'bench-%' ORDER BY slug`)
  for (const { id } of orgs) {
    await owner.$executeRawUnsafe(`
      INSERT INTO customers (id, organization_id, code, name, phone, updated_at)
      SELECT gen_random_uuid()::text, $1, 'KH' || g, 'Khách ' || g, '09' || lpad(g::text, 8, '0'), now() FROM generate_series(1, 200) g`, id)
    await owner.$executeRawUnsafe(`
      INSERT INTO products (id, organization_id, code, name, status, updated_at)
      SELECT gen_random_uuid()::text, $1, 'SP' || g, 'Mẫu ' || g, 'ACTIVE', now() FROM generate_series(1, 500) g`, id)
    await owner.$executeRawUnsafe(`
      INSERT INTO orders (id, organization_id, code, status, total_vnd, paid_vnd, balance_vnd, created_by, created_at, updated_at)
      SELECT gen_random_uuid()::text, $1, 'DH' || g, (ARRAY['DRAFT','CONFIRMED','COMPLETED'])[1 + g % 3]::order_status,
             500000, 0, 500000, 'bench', now() - (g || ' minutes')::interval, now()
      FROM generate_series(1, 1000) g`, id)
    await owner.$executeRawUnsafe(`
      INSERT INTO order_items (id, organization_id, order_id, description, quantity, unit_price_vnd, updated_at)
      SELECT gen_random_uuid()::text, o.organization_id, o.id, 'Bó hoa', 1, 500000, now() FROM orders o WHERE o.organization_id = $1`, id)
  }
  await owner.$executeRawUnsafe(`ANALYZE`)
  return orgs.map((o) => o.id)
}

type Op = { name: string; run: (db: PrismaClient, org: string, orderId: string) => Promise<number> }
const OPS_MIX: Op[] = [
  { name: "danh sách đơn", run: async (db, org) => (await db.orders.findMany({ where: { organization_id: org, status: "CONFIRMED" }, orderBy: { created_at: "desc" }, take: 20 })).length },
  { name: "chi tiết đơn", run: async (db, org, id) => (await db.orders.findFirst({ where: { id, organization_id: org }, include: { items: true } }))?.items.length ?? -1 },
  { name: "danh sách sản phẩm", run: async (db, org) => (await db.products.findMany({ where: { organization_id: org, status: "ACTIVE" }, take: 50 })).length },
  { name: "đếm khách", run: async (db, org) => db.customers.count({ where: { organization_id: org } }) },
  {
    // Một request điển hình: nhiều truy vấn liên tiếp trong cùng tổ chức (ngưỡng ADR-015 tính theo request)
    name: "request (4 truy vấn)",
    run: async (db, org, id) => {
      const list = await db.orders.findMany({ where: { organization_id: org }, orderBy: { created_at: "desc" }, take: 20 })
      const detail = await db.orders.findFirst({ where: { id, organization_id: org }, include: { items: true } })
      const products = await db.products.findMany({ where: { organization_id: org, status: "ACTIVE" }, take: 50 })
      const customers = await db.customers.count({ where: { organization_id: org } })
      return list.length + (detail?.items.length ?? 0) + products.length + customers
    },
  },
  {
    name: "giao dịch",
    run: async (db, org, id) =>
      db.$transaction(async (tx) => {
        await tx.orders.findFirst({ where: { id, organization_id: org }, select: { id: true } })
        return tx.order_items.count({ where: { order_id: id, organization_id: org } })
      }),
  },
]

function appUrl(): string {
  const u = new URL(url)
  u.username = ROLE
  u.password = PASSWORD
  return u.toString()
}

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0

async function measure(mode: RlsMode, orgs: string[], orderIds: Map<string, string[]>, ops: number) {
  const db = new PrismaClient({ adapter: new PrismaPg(new RlsPool({ connectionString: appUrl(), max: 10 }, mode)) })
  const samples = new Map<string, number[]>()
  let next = 0
  const worker = async () => {
    while (next < ops) {
      const i = next++
      const op = OPS_MIX[i % OPS_MIX.length]!
      const org = orgs[Math.floor(Math.random() * orgs.length)]!
      const ids = orderIds.get(org)!
      const id = ids[Math.floor(Math.random() * ids.length)]!
      const start = performance.now()
      await withTenantDb(org, () => op.run(db, org, id))
      const ms = performance.now() - start
      ;(samples.get(op.name) ?? samples.set(op.name, []).get(op.name)!).push(ms)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  await db.$disconnect()
  return samples
}

async function main() {
  setRlsAuditSink(() => {}) // không ghi log ghi nhận trong lúc đo
  const orgs = await setup()
  const orderIds = new Map<string, string[]>()
  for (const org of orgs) {
    orderIds.set(org, (await owner.orders.findMany({ where: { organization_id: org }, select: { id: true }, take: 200 })).map((o) => o.id))
  }
  for (const mode of MODES) await measure(mode, orgs, orderIds, 300) // làm nóng
  const all = new Map<RlsMode, Map<string, number[]>>(MODES.map((m) => [m, new Map()]))
  for (let round = 0; round < ROUNDS; round++) {
    for (const mode of MODES) {
      for (const [name, xs] of await measure(mode, orgs, orderIds, OPS)) {
        const into = all.get(mode)!
        into.set(name, [...(into.get(name) ?? []), ...xs])
      }
    }
  }
  console.log(`tổ chức=${orgs.length} thao tác/chế độ=${OPS * ROUNDS} đồng thời=${CONCURRENCY}`)
  console.log("| Truy vấn | " + MODES.map((m) => `${m} p50 / p95 / p99`).join(" | ") + " |")
  console.log("|---|" + MODES.map(() => "---:").join("|") + "|")
  const names = [...OPS_MIX.map((o) => o.name), "tất cả"]
  for (const name of names) {
    const cells = MODES.map((m) => {
      const xs = (name === "tất cả" ? [...all.get(m)!.values()].flat() : all.get(m)!.get(name) ?? []).sort((a, b) => a - b)
      return `${pct(xs, 50).toFixed(2)} / ${pct(xs, 95).toFixed(2)} / ${pct(xs, 99).toFixed(2)}`
    })
    console.log(`| ${name} | ${cells.join(" | ")} |`)
  }
  // Kết quả như nhau ở mọi chế độ: RLS không đổi kết quả của truy vấn đúng tổ chức
  const org0 = orgs[0]!
  const order0 = orderIds.get(org0)![0]!
  const outcomes = []
  for (const mode of MODES) {
    const db = new PrismaClient({ adapter: new PrismaPg(new RlsPool({ connectionString: appUrl(), max: 2 }, mode)) })
    outcomes.push(JSON.stringify(await Promise.all(OPS_MIX.map((op) => withTenantDb(org0, () => op.run(db, org0, order0))))))
    await db.$disconnect()
  }
  if (new Set(outcomes).size !== 1) throw new Error(`Kết quả khác nhau giữa các chế độ: ${outcomes.join(" ≠ ")}`)
  console.log(`kết quả như nhau ở ba chế độ: ${outcomes[0]}`)
  const p95 = (m: RlsMode) => pct([...all.get(m)!.values()].flat().sort((a, b) => a - b), 95)
  for (const m of ["audit", "enforce"] as const) console.log(`p95 ${m} so với off: ${(((p95(m) - p95("off")) / p95("off")) * 100).toFixed(1)}%`)
}

main()
  .then(async () => { await owner.$disconnect(); process.exit(0) })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    await owner.$disconnect()
    process.exit(1)
  })
