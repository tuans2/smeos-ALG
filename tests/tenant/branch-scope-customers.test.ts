import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getCustomer } from "@/app/api/v1/crm/customers/[id]/route"
import { GET as listCustomers, POST as createCustomer } from "@/app/api/v1/crm/customers/route"
import { PATCH as patchOrganization } from "@/app/api/v1/organizations/current/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/** CSDL test của CI dựng bằng `db push` → thiếu trigger của migration `*_customers_branch`; cài từ chính tệp migration. */
async function ensureCustomerBranchTrigger(): Promise<void> {
  const exists = await prisma.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'orders_customer_branch'`
  if ((exists[0]?.n ?? 0) > 0) return
  const dir = path.join(process.cwd(), "prisma/migrations")
  const migration = readdirSync(dir).find((d) => d.endsWith("_customers_branch"))
  if (!migration) throw new Error("Không thấy migration customers_branch")
  const sql = readFileSync(path.join(dir, migration, "migration.sql"), "utf8")
  const fn = sql.match(/CREATE OR REPLACE FUNCTION smeos_customers_branch_from_order[\s\S]*?END \$\$;/)?.[0]
  const trigger = sql.match(/CREATE TRIGGER "orders_customer_branch"[\s\S]*?;/)?.[0]
  if (!fn || !trigger) throw new Error("Migration customers_branch thiếu hàm / trigger")
  await prisma.$executeRawUnsafe(fn)
  await prisma.$executeRawUnsafe(trigger)
}

/** ADR-012 D-T7 bước T-5 (D-58, D-59): nhân viên chi nhánh A không thấy khách của chi nhánh B khi tổ chức bật đợt 1. */
describe("phạm vi chi nhánh đợt 1 — khách hàng", () => {
  let a: Tenant
  let q1: string
  let q3: string
  let lan: { userId: string; token: string }

  const customer = async (code: string, branchId: string | null) =>
    (await prisma.customers.create({ data: { organization_id: a.organizationId, code, name: code, phone: `09${code.replace(/\D/g, "").padStart(8, "0")}`, branch_id: branchId } })).id
  const codesFor = async (token: string) =>
    ((await readJson(await listCustomers(withSession(`${BASE}/crm/customers`, token)))).items as Array<{ code: string }> ?? []).map((c) => c.code).sort()
  const enableWave1 = () =>
    prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { branch_scope: { wave1: true } } } })

  beforeAll(async () => {
    await ensureCustomerBranchTrigger()
  })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    q1 = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Q1", code: "Q1" } })).id
    q3 = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Q3", code: "Q3" } })).id
    lan = await addStaffWithSession(a, "sale", "lan")
    await prisma.memberships.updateMany({ where: { organization_id: a.organizationId, user_id: lan.userId }, data: { branch_id: q1 } })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chưa bật đợt 1: nhân viên chi nhánh vẫn thấy mọi khách (hành vi cũ)", async () => {
    await customer("KH-1", q1)
    await customer("KH-3", q3)
    expect(await codesFor(lan.token)).toEqual(["KH-1", "KH-3"])
  })

  it("bật đợt 1: nhân viên Q1 thấy khách Q1 + khách dùng chung, mở khách Q3 → 404; Điều hành thấy tất cả", async () => {
    await customer("KH-1", q1)
    const other = await customer("KH-3", q3)
    await customer("KH-0", null)
    await enableWave1()
    expect(await codesFor(lan.token)).toEqual(["KH-0", "KH-1"])
    const res = await getCustomer(withSession(`${BASE}/crm/customers/${other}`, lan.token), { params: Promise.resolve({ id: other }) })
    expect(res.status).toBe(404)
    expect(await codesFor(a.token)).toEqual(["KH-0", "KH-1", "KH-3"])
  })

  it("khách tạo bởi nhân viên chi nhánh mang chi nhánh đó; khách tạo bởi Điều hành là khách dùng chung", async () => {
    const res = await createCustomer(withSession(`${BASE}/crm/customers`, lan.token, { method: "POST", body: JSON.stringify({ name: "Chị Hoa", phone: "0901234567" }) }))
    expect(res.status).toBeLessThan(300)
    expect((await prisma.customers.findFirstOrThrow({ where: { name: "Chị Hoa" } })).branch_id).toBe(q1)
    await createCustomer(withSession(`${BASE}/crm/customers`, a.token, { method: "POST", body: JSON.stringify({ name: "Anh Nam", phone: "0907654321" }) }))
    expect((await prisma.customers.findFirstOrThrow({ where: { name: "Anh Nam" } })).branch_id).toBeNull()
  })

  it("đơn đầu tiên có chi nhánh gán chi nhánh cho khách chưa có; khách đã có chi nhánh giữ nguyên", async () => {
    const shared = await customer("KH-0", null)
    const order = async (customerId: string, branchId: string | null) =>
      prisma.orders.create({ data: { id: randomUUID(), organization_id: a.organizationId, customer_id: customerId, branch_id: branchId, code: `DH-${randomUUID().slice(0, 6)}`, source: "MANUAL", status: "CONFIRMED", total_vnd: 1, paid_vnd: 0, balance_vnd: 1, created_by: a.userId } })
    await order(shared, null)
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: shared } })).branch_id).toBeNull()
    await order(shared, q3)
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: shared } })).branch_id).toBe(q3)
    await order(shared, q1)
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: shared } })).branch_id).toBe(q3)
  })

  it("tổ chức không tự bật được cờ qua PATCH settings (chỉ Admin SaaS)", async () => {
    const res = await patchOrganization(withSession(`${BASE}/organizations/current`, a.token, { method: "PATCH", body: JSON.stringify({ settings: { branch_scope: { wave1: true } } }) }))
    expect(res.status).toBeGreaterThanOrEqual(400)
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })
    expect((org.settings as Record<string, unknown> | null)?.branch_scope).toBeUndefined()
  })
})
