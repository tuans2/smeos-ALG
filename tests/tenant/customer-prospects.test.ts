import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import { STAFF_LEAD_REASONS, createStaffLead } from "@/modules/acquisition/use-cases/create-staff-lead"
import { queryCustomersForExport } from "@/modules/crm/infra/customer-export-query"
import { CustomerRepository } from "@/modules/crm/infra/customer-repository"
import { createCustomer } from "@/modules/crm/use-cases/create-customer"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { PROSPECT_PLACEHOLDER_NAME } from "@/modules/greeting-card/infra/session-customer"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { updateLinkCustomer } from "@/modules/greeting-card/use-cases/link-customer"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

const PHONE = "0912345678"
const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Chị Lan", customerPhone: PHONE, recipientName: "Người Nhận", recipientPhone: "0987654321",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1",
}

/** Khối backfill của migration `*_customer_prospects` (CSDL test dựng bằng `db push`, không chạy migration). */
function backfillSql(): string[] {
  const dir = path.join(process.cwd(), "prisma/migrations")
  const migration = readdirSync(dir).find((d) => d.endsWith("_customer_prospects"))
  if (!migration) throw new Error("Không thấy migration customer_prospects")
  const block = readFileSync(path.join(dir, migration, "migration.sql"), "utf8").match(/-- P2-BACKFILL-BEGIN[\s\S]*?-- P2-BACKFILL-END/)?.[0]
  if (!block) throw new Error("Migration customer_prospects thiếu khối backfill")
  return block.split(";").map((s) => s.replace(/--.*$/gm, "").trim()).filter(Boolean)
}

/**
 * ADR-014 D-P2, bước P-2 (PO 07/11/2026, phương án A): người nhận link Thẻ chào có SĐT là khách PROSPECT của đúng tổ
 * chức — không hiện ở danh sách/xuất khách; đặt đơn, để lại lead hay được tạo tay thì thành khách thường, vẫn một hồ sơ.
 */
describe("khách tiềm năng từ link Thẻ chào", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("tiem-a")
    b = await createTenant("tiem-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function link(t: Tenant, code: string, customer: { customerName?: string; customerPhone?: string } = {}) {
    const product = await new ProductRepository().create(t.ctx, { code, name: `Bó ${code}`, attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: code.toLowerCase(), name: `Bộ ${code}`, productIds: [product.id], createdBy: t.userId })
    return { ...(await createSendLink(t.ctx, { catalogId: catalog.id, ...customer })), productId: product.id }
  }
  const sessionOf = (id: string) => prisma.greeting_sessions.findUniqueOrThrow({ where: { id }, include: { customer: true } })
  const visible = async (t: Tenant) => (await new CustomerRepository().list(t.ctx)).items.map((c) => c.phone)

  it("link có SĐT → khách PROSPECT cùng tổ chức, không hiện ở danh sách, xuất, chi tiết; tổ chức khác không dùng chung", async () => {
    const la = await link(a, "A1", { customerName: "Chị Lan", customerPhone: PHONE })
    const lb = await link(b, "B1", { customerPhone: PHONE })
    const sa = await sessionOf(la.sessionId)
    const sb = await sessionOf(lb.sessionId)
    expect(sa.customer).toMatchObject({ organization_id: a.organizationId, phone: PHONE, name: "Chị Lan", status: "PROSPECT" })
    expect(sb.customer).toMatchObject({ organization_id: b.organizationId, name: PROSPECT_PLACEHOLDER_NAME, status: "PROSPECT" })
    expect(sb.customer_id).not.toBe(sa.customer_id)

    expect(await visible(a)).toEqual([])
    expect(await queryCustomersForExport(a.ctx)).toEqual([])
    expect(await new CustomerRepository().getById(a.ctx, sa.customer_id!)).toBeNull()
    expect(sa.customer_phone).toBe(PHONE) // ghi kép: cột cũ vẫn ghi
  })

  it("link không SĐT → không có hồ sơ; Sale ghi SĐT sau → gắn khách; lần sau dùng lại đúng hồ sơ", async () => {
    const first = await link(a, "A2")
    expect((await sessionOf(first.sessionId)).customer_id).toBeNull()
    await updateLinkCustomer(a.ctx, first.sessionId, { customerName: "Chị Lan", customerPhone: "0912 345 678" })
    const linked = await sessionOf(first.sessionId)
    expect(linked.customer).toMatchObject({ phone: PHONE, status: "PROSPECT" })

    const second = await link(a, "A3", { customerPhone: PHONE })
    expect((await sessionOf(second.sessionId)).customer_id).toBe(linked.customer_id)
    expect(await prisma.customers.count({ where: { organization_id: a.organizationId } })).toBe(1)
  })

  it("khách đặt đơn qua link → cùng hồ sơ thành khách thường, gắn với đơn và link", async () => {
    const l = await link(a, "A4", { customerName: "Lan (Sale ghi)", customerPhone: PHONE })
    const prospectId = (await sessionOf(l.sessionId)).customer_id
    await selectBrochureProduct(l.sendCode, l.productId)
    await submitBrochureOrder(l.sendCode, ORDER)

    const s = await sessionOf(l.sessionId)
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: s.order_id! } })
    expect(order.customer_id).toBe(prospectId)
    expect(s.customer_id).toBe(prospectId)
    expect(s.customer).toMatchObject({ status: "ACTIVE", name: "Chị Lan", address: "1 Lê Lợi, Q1" })
    expect(await visible(a)).toEqual([PHONE])
  })

  it("lead hoặc tạo tay với SĐT của khách tiềm năng → nâng hồ sơ đó, không báo trùng, không tạo hồ sơ thứ hai", async () => {
    const l1 = await link(a, "A5", { customerPhone: PHONE })
    const id1 = (await sessionOf(l1.sessionId)).customer_id
    await createStaffLead(a.ctx, { name: "Chị Lan", phone: PHONE, reason: STAFF_LEAD_REASONS[0] })
    expect(await prisma.customers.findUniqueOrThrow({ where: { id: id1! } })).toMatchObject({ status: "ACTIVE", name: "Chị Lan" })
    expect((await prisma.leads.findFirstOrThrow({ where: { organization_id: a.organizationId } })).customer_id).toBe(id1)

    const l2 = await link(a, "A6", { customerPhone: "0933333333" })
    const id2 = (await sessionOf(l2.sessionId)).customer_id
    const created = await createCustomer(a.ctx, { name: "Anh Minh", phone: "0933333333" })
    expect(created.id).toBe(id2)
    expect(await prisma.customers.findUniqueOrThrow({ where: { id: id2! } })).toMatchObject({ status: "ACTIVE", name: "Anh Minh" })
    expect(await prisma.customers.count({ where: { organization_id: a.organizationId } })).toBe(2)
    await expect(createCustomer(a.ctx, { name: "Trùng", phone: "0933333333" })).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("backfill của migration: link có đơn → khách của đơn; link chưa đơn → khách cùng SĐT hoặc PROSPECT mới; không lẫn tổ chức", async () => {
    const withOrder = await link(a, "A7")
    await selectBrochureProduct(withOrder.sendCode, withOrder.productId)
    await submitBrochureOrder(withOrder.sendCode, ORDER)
    const known = await link(a, "A8")
    const fresh = await link(a, "A9")
    const fresh2 = await link(a, "A10")
    const other = await link(b, "B2")
    const nameOnly = await link(a, "A11")
    // Trạng thái trước migration: chỉ có tên/SĐT (chữ rõ, trước P-5c) trên link, chưa có customer_id. Ghi bằng SQL thô —
    // qua client Prisma thì SĐT thành bản mã (mỗi lần một IV), khối backfill so chữ rõ không bao giờ khớp.
    const legacy = async (id: string, name: string | null, phone: string | null) =>
      prisma.$executeRaw`UPDATE "greeting_sessions" SET "customer_id" = NULL, "customer_name" = ${name}, "customer_phone" = ${phone} WHERE "id" = ${id}`
    await prisma.greeting_sessions.update({ where: { id: withOrder.sessionId }, data: { customer_id: null } })
    const orderCustomerId = (await prisma.orders.findFirstOrThrow({ where: { source_session_id: withOrder.sessionId } })).customer_id
    await prisma.$executeRaw`UPDATE "customers" SET "phone" = ${PHONE} WHERE "id" = ${orderCustomerId}`
    await legacy(known.sessionId, "Lan cũ", PHONE)
    await legacy(fresh.sessionId, "Cũ hơn", "0944444444")
    await legacy(fresh2.sessionId, "Mới nhất", "0944444444")
    await legacy(other.sessionId, null, PHONE)
    await legacy(nameOnly.sessionId, "Chỉ có tên", null)

    for (const stmt of backfillSql()) await prisma.$executeRawUnsafe(stmt)

    const orderCustomer = (await prisma.orders.findFirstOrThrow({ where: { source_session_id: withOrder.sessionId } })).customer_id
    expect((await sessionOf(withOrder.sessionId)).customer_id).toBe(orderCustomer)
    expect((await sessionOf(known.sessionId)).customer_id).toBe(orderCustomer) // cùng SĐT với khách của đơn
    const f1 = await sessionOf(fresh.sessionId)
    expect(f1.customer).toMatchObject({ organization_id: a.organizationId, phone: "0944444444", status: "PROSPECT", name: "Mới nhất" })
    expect((await sessionOf(fresh2.sessionId)).customer_id).toBe(f1.customer_id)
    expect((await sessionOf(other.sessionId)).customer).toMatchObject({ organization_id: b.organizationId, status: "PROSPECT", name: PROSPECT_PLACEHOLDER_NAME })
    expect((await sessionOf(nameOnly.sessionId)).customer_id).toBeNull()

    const before = await prisma.customers.count()
    for (const stmt of backfillSql()) await prisma.$executeRawUnsafe(stmt) // chạy lại không tạo thêm
    expect(await prisma.customers.count()).toBe(before)
  })
})
