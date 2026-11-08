import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { setPurgeReason } from "@/core/tenancy/infra/purge-reason"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

const TABLES = ["audit_logs", "platform_audit_logs", "order_events", "job_events", "usage"] as const

/**
 * CSDL test dựng bằng `db push` (không chạy migration) → cài hàm + trigger từ chính tệp migration `*_append_only_logs`
 * cho tệp này, và GỠ ở afterAll để các tệp test khác chạy trên CSDL như cũ (tệp test chạy tuần tự).
 */
function migrationSql(): { fn: string; triggers: string[] } {
  const dir = path.join(process.cwd(), "prisma/migrations")
  const migration = readdirSync(dir).find((d) => d.endsWith("_append_only_logs"))
  if (!migration) throw new Error("Không thấy migration append_only_logs")
  const sql = readFileSync(path.join(dir, migration, "migration.sql"), "utf8")
  const fn = sql.match(/CREATE OR REPLACE FUNCTION smeos_append_only_guard[\s\S]*?END \$\$;/)?.[0]
  const triggers = [...sql.matchAll(/CREATE TRIGGER "\w+_append_only"[\s\S]*?;/g)].map((m) => m[0])
  if (!fn || triggers.length !== TABLES.length) throw new Error("Migration append_only_logs thiếu hàm hoặc trigger")
  return { fn, triggers }
}

async function dropGuards(): Promise<void> {
  for (const table of TABLES) await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${table}_append_only" ON "${table}"`)
  await prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS smeos_append_only_guard()")
}

/** ADR-013 D-I4, bước I-2a: nhật ký chỉ thêm dòng; xoá chỉ qua đường purge (`app.purge_reason`). */
describe("nhật ký bất biến", () => {
  let t: Tenant

  beforeAll(async () => {
    await dropGuards()
    const { fn, triggers } = migrationSql()
    await prisma.$executeRawUnsafe(fn)
    for (const trigger of triggers) await prisma.$executeRawUnsafe(trigger)
  })

  afterAll(async () => {
    await dropGuards()
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await resetDatabase() // TRUNCATE không qua trigger theo dòng — CSDL test vẫn dọn được
    t = await createTenant("tiem-nhat-ky")
  })

  async function seedOrderWithEvent(): Promise<string> {
    const order = await prisma.orders.create({
      data: {
        organization_id: t.organizationId, code: "DH261106-0001", source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000, created_by: "test",
        events: { create: { axis: "order", to_value: "CONFIRMED" } },
      },
    })
    return order.id
  }

  const audit = () =>
    prisma.audit_logs.create({
      data: { organization_id: t.organizationId, user_id: t.userId, action: "test.write", entity_type: "orders", entity_id: "x" },
    })

  it("thêm dòng vẫn được; sửa dòng nhật ký bị từ chối", async () => {
    const row = await audit()
    await expect(prisma.audit_logs.update({ where: { id: row.id }, data: { action: "test.tampered" } })).rejects.toThrow(/chỉ được thêm dòng/)
    expect((await prisma.audit_logs.findUniqueOrThrow({ where: { id: row.id } })).action).toBe("test.write")
  })

  it("xoá nhật ký ngoài đường purge bị từ chối — kể cả xoá dây chuyền từ đơn hàng", async () => {
    await audit()
    const orderId = await seedOrderWithEvent()
    await expect(prisma.audit_logs.deleteMany({ where: { organization_id: t.organizationId } })).rejects.toThrow(/purge_reason/)
    await expect(prisma.orders.delete({ where: { id: orderId } })).rejects.toThrow(/purge_reason/)
    expect(await prisma.order_events.count({ where: { order_id: orderId } })).toBe(1)
    expect(await prisma.orders.count({ where: { id: orderId } })).toBe(1)
  })

  it("đường purge (lý do đặt trong giao dịch) xoá được; lý do không rò sang giao dịch sau", async () => {
    await audit()
    const orderId = await seedOrderWithEvent()
    await prisma.$transaction(async (tx) => {
      await setPurgeReason(tx, "tenant_offboarding")
      await tx.orders.delete({ where: { id: orderId } })
      await tx.audit_logs.deleteMany({ where: { organization_id: t.organizationId } })
    })
    expect(await prisma.order_events.count({ where: { order_id: orderId } })).toBe(0)
    expect(await prisma.audit_logs.count({ where: { organization_id: t.organizationId } })).toBe(0)

    await audit()
    await expect(prisma.audit_logs.deleteMany({ where: { organization_id: t.organizationId } })).rejects.toThrow(/purge_reason/)
  })

  it("đủ năm bảng nhật ký có trigger", async () => {
    const rows = await prisma.$queryRaw<Array<{ tgname: string }>>`
      SELECT tgname FROM pg_trigger WHERE tgname LIKE '%_append_only' ORDER BY tgname`
    expect(rows.map((r) => r.tgname)).toEqual(TABLES.map((x) => `${x}_append_only`).sort())
  })
})
