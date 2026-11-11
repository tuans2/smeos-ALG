import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { runRetentionSweep } from "@/modules/organization/use-cases/run-retention-sweep"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-014 D-P4, bước P-6a: hạn lưu theo loại dữ liệu. Mặc định chỉ đếm; bật `enforce` thì xoá / ẩn danh đúng dòng quá
 * hạn (nhật ký kỹ thuật 3 tháng, thông tin giao nhận 12 tháng sau khi đơn xong, nhật ký kiểm toán 5 năm); dòng còn hạn,
 * đơn chưa xong và tổ chức đang legal hold giữ nguyên.
 */
const DAY = 24 * 60 * 60 * 1000
const NOW = new Date()
const ago = (days: number) => new Date(NOW.getTime() - days * DAY)
const DEFAULTS = [
  { category: "technical_logs", retention_months: 3, action: "DELETE" as const },
  { category: "delivery_info", retention_months: 12, action: "ANONYMIZE" as const },
  { category: "audit_logs", retention_months: 60, action: "DELETE" as const },
]

async function resetPolicies(enforce: boolean) {
  await prisma.retention_policies.deleteMany({})
  await prisma.retention_policies.createMany({ data: DEFAULTS.map((p) => ({ ...p, enforce })) })
}

async function seed(t: Tenant, tag: string) {
  const org = t.organizationId
  const note = (created_at: Date) =>
    prisma.notification_inbox.create({ data: { organization_id: org, user_id: t.userId, event_key: "order.created", title: "Đơn mới", message: "Có đơn mới", created_at } })
  await note(ago(120))
  await note(ago(10))
  const audit = (created_at: Date) =>
    prisma.audit_logs.create({ data: { organization_id: org, user_id: t.userId, action: "product.update", entity_type: "products", entity_id: tag, created_at } })
  await audit(ago(6 * 365))
  await audit(ago(30))
  const order = async (code: string, status: "COMPLETED" | "CANCELLED" | "CONFIRMED", days: number) => {
    const o = await prisma.orders.create({
      data: { organization_id: org, code: `${code}-${tag}`, status, total_vnd: 100_000, paid_vnd: 100_000, balance_vnd: 0, created_by: t.userId, delivery_address: { line: "12 Lý Thường Kiệt" } },
    })
    await prisma.order_recipients.create({
      data: { organization_id: org, order_id: o.id, recipient_name: "Bà Hoa", recipient_phone: "0100000003", address_line: "12 Lý Thường Kiệt", vat_company_name: "Công ty Hoa Việt", vat_tax_code: "0101234567" },
    })
    await prisma.$executeRaw`UPDATE "orders" SET updated_at = ${ago(days)} WHERE id = ${o.id}`
    return o.id
  }
  return { oldDone: await order("DH1", "COMPLETED", 400), oldCancelled: await order("DH2", "CANCELLED", 400), oldOpen: await order("DH3", "CONFIRMED", 400), recentDone: await order("DH4", "COMPLETED", 30) }
}

const snapshot = async (org: string) => ({
  notifications: await prisma.notification_inbox.count({ where: { organization_id: org } }),
  audits: await prisma.audit_logs.count({ where: { organization_id: org } }),
  named: await prisma.order_recipients.count({ where: { organization_id: org, recipient_name: { not: null } } }),
  addressed: (await prisma.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM "orders" WHERE organization_id = ${org} AND delivery_address IS NOT NULL`)[0]?.n,
})

describe("hạn lưu theo loại dữ liệu", () => {
  let a: Tenant
  let held: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("han-luu-a")
    held = await createTenant("han-luu-giu")
    await prisma.organizations.update({ where: { id: held.organizationId }, data: { legal_hold_until: new Date(NOW.getTime() + 30 * DAY) } })
  })

  afterAll(async () => {
    await resetPolicies(false)
    await disconnectDatabase()
  })

  it("mặc định chỉ đếm: báo đúng số dòng quá hạn, không đổi dữ liệu, ghi lần chạy", async () => {
    await resetPolicies(false)
    await seed(a, "a")
    await seed(held, "g")
    const before = await snapshot(a.organizationId)

    const rows = await runRetentionSweep(NOW)
    const by = Object.fromEntries(rows.map((r) => [r.category, r]))
    expect(by["technical_logs"]).toMatchObject({ enforced: false, rows: 1 })
    expect(by["technical_logs"]?.tables.find((t) => t.table === "notification_inbox")?.rows).toBe(1)
    expect(by["audit_logs"]?.tables.find((t) => t.table === "audit_logs")?.rows).toBe(1)
    expect(by["delivery_info"]?.tables).toEqual([{ table: "order_recipients", rows: 2 }, { table: "orders", rows: 2 }])

    expect(await snapshot(a.organizationId)).toEqual(before)
    const policy = await prisma.retention_policies.findUniqueOrThrow({ where: { category: "delivery_info" } })
    expect(policy).toMatchObject({ last_run_rows: 4, last_run_at: NOW })
  })

  it("bật thực thi: xoá / ẩn danh đúng dòng quá hạn, giữ hoá đơn VAT; legal hold và dòng còn hạn giữ nguyên", async () => {
    await resetPolicies(true)
    const ids = await seed(a, "a")
    await seed(held, "g")
    const before = await snapshot(a.organizationId)
    const heldBefore = await snapshot(held.organizationId)
    const oldPlatformLog = await prisma.platform_audit_logs.create({
      data: { user_id: "platform-admin", action: "platform.health.read", entity_type: "platform", entity_id: "health", created_at: ago(6 * 365) },
    })

    const rows = await runRetentionSweep(NOW)
    expect(rows.every((r) => r.enforced && !r.skipped)).toBe(true)

    expect(await snapshot(a.organizationId)).toEqual({
      notifications: before.notifications - 1, audits: before.audits - 1, named: before.named - 2, addressed: (before.addressed ?? 0) - 2,
    })
    for (const id of [ids.oldDone, ids.oldCancelled]) {
      const r = await prisma.order_recipients.findUniqueOrThrow({ where: { order_id: id } })
      expect(r).toMatchObject({ recipient_name: null, recipient_phone: null, address_line: null, address_parts: null, vat_company_name: "Công ty Hoa Việt", vat_tax_code: "0101234567" })
    }
    for (const id of [ids.oldOpen, ids.recentDone]) {
      expect((await prisma.order_recipients.findUniqueOrThrow({ where: { order_id: id } })).recipient_name).toBe("Bà Hoa")
    }
    expect(await prisma.platform_audit_logs.findUnique({ where: { id: oldPlatformLog.id } })).toBeNull()
    expect(await snapshot(held.organizationId)).toEqual(heldBefore)

    // Lượt sau không còn gì quá hạn
    const again = await runRetentionSweep(NOW)
    expect(again.reduce((n, r) => n + r.rows, 0)).toBe(0)
  })

  it("chạy thử bỏ qua cờ thực thi và không ghi lần chạy; loại chưa hỗ trợ bị bỏ qua", async () => {
    await resetPolicies(true)
    await prisma.retention_policies.create({ data: { category: "customers", retention_months: 24, action: "ANONYMIZE", enforce: true } })
    await seed(a, "a")
    const before = await snapshot(a.organizationId)

    const rows = await runRetentionSweep(NOW, { dryRun: true })
    expect(rows.find((r) => r.category === "customers")?.skipped).toMatch(/chưa được hỗ trợ/)
    expect(rows.filter((r) => !r.skipped).every((r) => !r.enforced)).toBe(true)
    expect(await snapshot(a.organizationId)).toEqual(before)
    expect((await prisma.retention_policies.findUniqueOrThrow({ where: { category: "technical_logs" } })).last_run_at).toBeNull()
  })
})
