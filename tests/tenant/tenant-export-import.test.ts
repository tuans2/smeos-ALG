import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { setPurgeReason } from "@/core/tenancy/infra/purge-reason"
import { exportTenant, type TenantPackage } from "@/modules/organization/infra/tenant-export"
import { importTenant } from "@/modules/organization/infra/tenant-import"
import { TRANSFER_SOURCES } from "@/modules/organization/infra/tenant-transfer-sources"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-016 D-S3, bước S-2: vòng tròn xuất → xoá → nhập → xuất lại khớp từng dòng (checksum từng bảng), kể cả khoá ngoại
 * tạo vòng (đơn ↔ lead) và cột cá nhân đã mã hoá; tổ chức khác không bị chạm; gói sai / khác schema / trùng tổ chức bị từ
 * chối, không ghi gì.
 */
async function seed(t: Tenant) {
  const org = t.organizationId
  const customer = await prisma.customers.create({ data: { organization_id: org, code: "KH-1", name: "Chị Lan", phone: "0100000001", email: "lan@vi-du.test" } })
  const lead = await prisma.leads.create({ data: { organization_id: org, customer_id: customer.id, name: "Chị Lan", phone: "0100000001", source: "MANUAL", consent_at: new Date(), consent_version: "v1" } })
  const order = await prisma.orders.create({
    data: { organization_id: org, code: "DH-1", customer_id: customer.id, lead_id: lead.id, status: "COMPLETED", total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: t.userId },
  })
  await prisma.leads.update({ where: { id: lead.id }, data: { converted_order_id: order.id, status: "WON" } }) // vòng đơn ↔ lead
  await prisma.order_items.create({ data: { organization_id: org, order_id: order.id, description: "Bó hồng", quantity: 1, unit_price_vnd: 500_000 } })
  await prisma.order_recipients.create({ data: { organization_id: org, order_id: order.id, recipient_name: "Bà Hoa", recipient_phone: "0100000003", vat_tax_code: "0101234567" } })
  await prisma.order_events.create({ data: { organization_id: org, order_id: order.id, axis: "status", to_value: "COMPLETED" } })
  await prisma.products.create({ data: { organization_id: org, code: "SP-1", name: "Bó hồng", status: "ACTIVE" } })
  await prisma.assets.create({ data: { organization_id: org, kind: "ORIGINAL", storage_key: `org/${org}/p/anh.jpg`, mime_type: "image/jpeg", created_by: t.userId } })
}

/** Xoá sạch tổ chức trong CSDL test (con trước cha), như bước xoá của khôi phục riêng (D-S4). */
async function wipe(organizationId: string) {
  await prisma.$transaction(async (tx) => {
    await setPurgeReason(tx, "test_data_cleanup")
    const userIds = (await tx.memberships.findMany({ where: { organization_id: organizationId }, select: { user_id: true } })).map((m) => m.user_id)
    for (const { table, where } of [...TRANSFER_SOURCES].reverse()) {
      if (table === "users") continue
      await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE ${where}`, organizationId)
    }
    await tx.users.deleteMany({ where: { id: { in: userIds } } })
  })
}

const checksumsWithoutTime = (p: TenantPackage) => ({ ...p.checksums })

describe("xuất / nhập một tổ chức", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("chuyen-a")
    b = await createTenant("chuyen-b")
    await seed(a)
    await seed(b)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("vòng tròn xuất → xoá → nhập → xuất lại khớp từng bảng; tổ chức khác nguyên vẹn", async () => {
    const otherBefore = await exportTenant(b.organizationId, new Date())
    const pkg = JSON.parse(JSON.stringify(await exportTenant(a.organizationId, new Date()))) as TenantPackage
    expect(Object.keys(pkg.tables)).toEqual(expect.arrayContaining(["organizations", "users", "memberships", "customers", "orders", "leads", "order_recipients", "tenant_data_keys"]))
    expect(pkg.files).toEqual([`org/${a.organizationId}/p/anh.jpg`])
    expect(JSON.stringify(pkg.tables["customers"])).not.toContain("0100000001") // cột cá nhân giữ bản mã

    await wipe(a.organizationId)
    expect(await prisma.organizations.count({ where: { id: a.organizationId } })).toBe(0)

    const result = await importTenant(pkg)
    expect(result.inserted.find((r) => r.table === "orders")?.rows).toBe(1)
    const again = await exportTenant(a.organizationId, new Date())
    expect(checksumsWithoutTime(again)).toEqual(checksumsWithoutTime(pkg))
    expect((await prisma.leads.findFirstOrThrow({ where: { organization_id: a.organizationId } })).converted_order_id).not.toBeNull()
    expect((await prisma.customers.findFirstOrThrow({ where: { organization_id: a.organizationId } })).phone).toBe("0100000001") // giải mã được

    expect(checksumsWithoutTime(await exportTenant(b.organizationId, new Date()))).toEqual(checksumsWithoutTime(otherBefore))
  })

  it("từ chối và không ghi gì: tổ chức đã có, gói bị sửa, khác phiên bản schema", async () => {
    const pkg = await exportTenant(a.organizationId, new Date())
    await expect(importTenant(pkg)).rejects.toThrow(/đã có ở CSDL đích/)

    await wipe(a.organizationId)
    const tampered = JSON.parse(JSON.stringify(pkg)) as TenantPackage
    ;(tampered.tables["orders"]![0] as Record<string, unknown>)["total_vnd"] = 1
    await expect(importTenant(tampered)).rejects.toThrow(/Checksum bảng orders/)
    await expect(importTenant({ ...pkg, schemaVersion: "20000101000000_cu" })).rejects.toThrow(/Khác phiên bản schema/)
    expect(await prisma.organizations.count({ where: { id: a.organizationId } })).toBe(0)
  })
})
