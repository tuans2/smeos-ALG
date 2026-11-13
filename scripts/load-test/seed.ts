/**
 * Sinh dữ liệu quy mô mục tiêu cho thử tải (ADR-015 D-O7, bước O-9) — CHỈ trên CSDL tạm (khôi phục PITR):
 *   npm run load:seed                    (đủ quy mô: 1 chuỗi × 200 chi nhánh × 500 đơn/ngày × 12 tháng + 300 tiệm lẻ)
 *   npm run load:seed -- --scale 0.02    (thử nhanh)
 * Tổ chức tạo qua luồng đăng ký thật; khách, đơn, dòng đơn, phiếu thu sinh bằng SQL `generate_series` cho nhanh. Ghi ra
 * `scripts/load-test/.seed.json` (id tổ chức, người dùng) để `npm run load:run` dùng. Không dữ liệu cá nhân thật.
 */
import { randomBytes } from "node:crypto"
import { writeFileSync } from "node:fs"
import path from "node:path"

import { prisma } from "@/core/tenancy/infra/prisma"
import { asSystemDb } from "@/core/tenancy/db-context"
import { signUp } from "@/modules/organization/use-cases/sign-up"

import { assertLoadTestDatabase } from "./guard"

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? Number(process.argv[i + 1]) : fallback
}
const SCALE = arg("scale", 1)
const DAYS = 365
const CHAIN_BRANCHES = Math.max(2, Math.round(200 * Math.min(1, SCALE * 5)))
const CHAIN_ORDERS_PER_DAY = Math.max(1, Math.round(500 * SCALE))
const SHOPS = Math.max(1, Math.round(300 * Math.min(1, SCALE * 5)))
const SHOP_ORDERS_PER_DAY = Math.max(1, Math.round(arg("shop-orders-per-day", 20) * SCALE))
const STAMP = Date.now()

/** Người dùng thử tải không đăng nhập — mật khẩu ngẫu nhiên, không ai biết. */
async function tenant(label: string, chain: boolean) {
  const r = await signUp({ email: `load-${label}-${STAMP}@vi-du.test`, password: randomBytes(18).toString("base64url"), name: `Thử tải ${label}`, organizationName: `Thử tải ${label} ${STAMP}` })
  await prisma.memberships.updateMany({ where: { user_id: r.userId, organization_id: r.organizationId }, data: { status: "ACTIVE" } })
  if (chain) await prisma.organizations.update({ where: { id: r.organizationId }, data: { type: "CHAIN" } })
  return { organizationId: r.organizationId, userId: r.userId }
}

/** Khách, đơn (rải đều 12 tháng), một dòng đơn mỗi đơn, phiếu thu cho đơn đã thu — trong một giao dịch mỗi tổ chức. */
async function fill(org: string, user: string, branches: number, customers: number, ordersPerDay: number) {
  await prisma.$transaction(async (tx) => {
    if (branches > 0) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "branches"(id, organization_id, name, code, created_at, updated_at)
         SELECT gen_random_uuid(), $1, 'Chi nhánh ' || g, 'CN-' || g, now(), now() FROM generate_series(1, $2) g`, org, branches)
    }
    await tx.$executeRawUnsafe(
      `INSERT INTO "customers"(id, organization_id, code, name, phone, created_at, updated_at)
       SELECT gen_random_uuid(), $1, 'KH-' || g, 'Khách thử tải ' || g, '0100' || lpad(g::text, 6, '0'), now(), now()
       FROM generate_series(1, $2) g`, org, customers)
    await tx.$executeRawUnsafe(
      `WITH b AS (SELECT array_agg(id) a FROM "branches" WHERE organization_id = $1),
            c AS (SELECT array_agg(id) a FROM "customers" WHERE organization_id = $1)
       INSERT INTO "orders"(id, organization_id, code, status, total_vnd, paid_vnd, balance_vnd, created_by, branch_id, customer_id, created_at, updated_at)
       SELECT gen_random_uuid(), $1, 'LT-' || g, s.status, s.total, CASE WHEN s.status = 'COMPLETED' THEN s.total ELSE 0 END,
              CASE WHEN s.status = 'COMPLETED' THEN 0 ELSE s.total END, $2,
              CASE WHEN cardinality(b.a) > 0 THEN b.a[1 + (g % cardinality(b.a))] END,
              CASE WHEN g % 10 < 7 THEN c.a[1 + (g % cardinality(c.a))] END,
              now() - ((g::float / $3) * interval '365 days'), now() - ((g::float / $3) * interval '365 days')
       FROM generate_series(1, $3) g, b, c,
            LATERAL (SELECT (CASE WHEN g % 20 = 0 THEN 'CANCELLED' WHEN g % 50 = 1 THEN 'CONFIRMED' ELSE 'COMPLETED' END)::order_status AS status,
                            (200000 + (g * 7919) % 1800000) AS total) s`,
      org, user, ordersPerDay * DAYS)
    await tx.$executeRawUnsafe(
      `INSERT INTO "order_items"(id, organization_id, order_id, description, quantity, unit_price_vnd, created_at, updated_at)
       SELECT gen_random_uuid(), organization_id, id, 'Bó hoa thử tải', 1, total_vnd, created_at, created_at FROM "orders" WHERE organization_id = $1`, org)
    await tx.$executeRawUnsafe(
      `INSERT INTO "order_payments"(id, organization_id, order_id, kind, amount_vnd, collected_by, collected_at, created_at)
       SELECT gen_random_uuid(), organization_id, id, 'BALANCE', paid_vnd, $2, created_at, created_at FROM "orders" WHERE organization_id = $1 AND paid_vnd > 0`, org, user)
  }, { timeout: 60 * 60_000, maxWait: 60_000 })
}

async function main() {
  const db = assertLoadTestDatabase()
  console.log(`CSDL ${db} · scale ${SCALE}: chuỗi ${CHAIN_BRANCHES} chi nhánh × ${CHAIN_ORDERS_PER_DAY} đơn/ngày; ${SHOPS} tiệm × ${SHOP_ORDERS_PER_DAY} đơn/ngày; ${DAYS} ngày`)
  const started = Date.now()
  const chain = await tenant("chuoi", true)
  await fill(chain.organizationId, chain.userId, CHAIN_BRANCHES, Math.max(100, Math.round(20000 * SCALE)), CHAIN_ORDERS_PER_DAY)
  const shops: Array<{ organizationId: string; userId: string }> = []
  for (let i = 1; i <= SHOPS; i++) {
    const s = await tenant(`tiem-${i}`, false)
    await fill(s.organizationId, s.userId, 0, Math.max(20, Math.round(500 * SCALE)), SHOP_ORDERS_PER_DAY)
    shops.push(s)
    if (i % 25 === 0) console.log(`  ${i}/${SHOPS} tiệm`)
  }
  await prisma.$executeRawUnsafe(`ANALYZE`)
  writeFileSync(path.join(process.cwd(), "scripts/load-test/.seed.json"), JSON.stringify({ db, scale: SCALE, chain, shops }, null, 2))
  console.log(`xong sau ${Math.round((Date.now() - started) / 1000)} s — chạy tiếp: npm run load:run`)
}

asSystemDb("script:load-seed", main).then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
