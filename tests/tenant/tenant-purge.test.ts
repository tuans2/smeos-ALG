import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { executeTenantPurge, planTenantPurge } from "@/modules/organization/infra/tenant-purge"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-016 D-S5, bước S-3b: xoá hẳn một tổ chức đã rời nền tảng. Giữ chứng từ ghi sổ (đơn đã thu tiền, dòng đơn, phiếu
 * thu, hoá đơn VAT) và nhật ký; ẩn danh khách trên chứng từ; xoá phần còn lại; tệp vào hàng đợi xoá; tổ chức khác
 * không bị chạm.
 */
const DAY = 24 * 60 * 60 * 1000

async function seed(t: Tenant, tag: string) {
  const org = t.organizationId
  await prisma.products.create({ data: { organization_id: org, code: `SP-${tag}`, name: "Bó hồng", status: "ACTIVE" } })
  const buyer = await prisma.customers.create({ data: { organization_id: org, code: `KH1-${tag}`, name: "Chị Lan", phone: "0100000001", email: "lan@vi-du.test", notes: "thích hồng" } })
  await prisma.customers.create({ data: { organization_id: org, code: `KH2-${tag}`, name: "Anh Minh", phone: "0100000002" } })
  const paid = await prisma.orders.create({
    data: {
      organization_id: org, code: `DH1-${tag}`, customer_id: buyer.id, status: "COMPLETED", total_vnd: 500_000, paid_vnd: 500_000,
      balance_vnd: 0, created_by: t.userId, card_message: "Chúc mừng sinh nhật", internal_note: "giao chiều",
    },
  })
  await prisma.order_items.create({ data: { organization_id: org, order_id: paid.id, description: "Bó hồng", quantity: 1, unit_price_vnd: 500_000 } })
  await prisma.order_payments.create({ data: { organization_id: org, order_id: paid.id, kind: "BALANCE", amount_vnd: 500_000, collected_by: t.userId, note: "chuyển khoản" } })
  await prisma.order_events.create({ data: { organization_id: org, order_id: paid.id, axis: "status", to_value: "COMPLETED" } })
  await prisma.order_recipients.create({
    data: { organization_id: org, order_id: paid.id, recipient_name: "Bà Hoa", recipient_phone: "0100000003", address_line: "12 Lý Thường Kiệt", vat_company_name: "Công ty Hoa Việt", vat_tax_code: "0101234567" },
  })
  await prisma.orders.create({ data: { organization_id: org, code: `DH2-${tag}`, status: "CANCELLED", total_vnd: 300_000, paid_vnd: 0, balance_vnd: 300_000, created_by: t.userId } })
  await prisma.assets.create({ data: { organization_id: org, kind: "ORIGINAL", storage_key: `org/${org}/p/anh-${tag}.jpg`, mime_type: "image/jpeg", created_by: t.userId } })
  return { paidOrderId: paid.id, buyerId: buyer.id }
}

const countsOf = async (org: string) => ({
  products: await prisma.products.count({ where: { organization_id: org } }),
  customers: await prisma.customers.count({ where: { organization_id: org } }),
  orders: await prisma.orders.count({ where: { organization_id: org } }),
  assets: await prisma.assets.count({ where: { organization_id: org } }),
  memberships: await prisma.memberships.count({ where: { organization_id: org } }),
  orderEvents: await prisma.order_events.count({ where: { organization_id: org } }),
})

describe("xoá hẳn tổ chức đã rời nền tảng", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("xoa-a")
    b = await createTenant("xoa-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("không đủ điều kiện → không xoá gì: đang hoạt động, chưa hết hạn giữ, đang legal hold", async () => {
    await seed(a, "a")
    const before = await countsOf(a.organizationId)
    await expect(executeTenantPurge(a.organizationId, new Date())).rejects.toThrow(/rời nền tảng/)
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { lifecycle_status: "OFFBOARDING", offboarding_until: new Date(Date.now() + DAY) } })
    await expect(executeTenantPurge(a.organizationId, new Date())).rejects.toThrow(/hạn giữ/)
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { offboarding_until: new Date(Date.now() - DAY), legal_hold_until: new Date(Date.now() + DAY) } })
    await expect(executeTenantPurge(a.organizationId, new Date())).rejects.toThrow(/legal hold/)
    expect(await countsOf(a.organizationId)).toEqual(before)
  })

  it("xoá: giữ chứng từ + nhật ký, ẩn danh khách và người nhận (giữ hoá đơn VAT), tệp vào hàng đợi; tổ chức khác nguyên vẹn", async () => {
    const kept = await seed(a, "a")
    await seed(b, "b")
    const otherBefore = await countsOf(b.organizationId)
    const auditBefore = await prisma.audit_logs.count({ where: { organization_id: a.organizationId } })
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { lifecycle_status: "OFFBOARDING", offboarding_until: new Date(Date.now() - DAY) } })

    const plan = await planTenantPurge(a.organizationId)
    expect(plan.find((r) => r.table === "orders")?.rows).toBe(1) // chỉ đơn huỷ chưa thu tiền
    expect(plan.find((r) => r.table === "customers")?.rows).toBe(1) // khách không còn chứng từ

    const result = await executeTenantPurge(a.organizationId, new Date())
    expect(result.fileKeysQueued).toBe(1)
    expect(result.deleted).toEqual(expect.arrayContaining(plan))

    expect(await countsOf(a.organizationId)).toEqual({ products: 0, customers: 1, orders: 1, assets: 0, memberships: 0, orderEvents: 0 })
    expect(await prisma.order_items.count({ where: { order_id: kept.paidOrderId } })).toBe(1)
    expect(await prisma.order_payments.count({ where: { order_id: kept.paidOrderId } })).toBe(1)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId } })).toBe(auditBefore)
    expect(await prisma.storage_outbox.count({ where: { organization_id: a.organizationId } })).toBe(1)

    const buyer = await prisma.customers.findUniqueOrThrow({ where: { id: kept.buyerId } })
    expect(buyer).toMatchObject({ name: "Khách đã xoá", phone: "ERASED", email: null, notes: null })
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: kept.paidOrderId } })
    expect(order).toMatchObject({ card_message: null, internal_note: null, paid_vnd: expect.anything() })
    const recipient = await prisma.order_recipients.findUniqueOrThrow({ where: { order_id: kept.paidOrderId } })
    expect(recipient).toMatchObject({ recipient_name: null, recipient_phone: null, address_line: null, vat_company_name: "Công ty Hoa Việt", vat_tax_code: "0101234567" })
    expect((await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).lifecycle_status).toBe("DELETED")

    expect(await countsOf(b.organizationId)).toEqual(otherBefore)
    await expect(executeTenantPurge(a.organizationId, new Date())).rejects.toThrow(/đã được xoá/)
  })
})
