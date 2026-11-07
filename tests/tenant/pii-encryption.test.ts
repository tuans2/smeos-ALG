import { readFileSync } from "node:fs"
import path from "node:path"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { decryptPii, phoneHash, piiMasterKey } from "@/core/security/pii-cipher"
import { PII_FIELDS } from "@/core/security/pii-fields"
import { encryptPendingPii, type PiiBackfillClient } from "@/core/security/infra/pii-backfill"
import { currentDataKey, dataKeyByVersion, resetPiiKeyCache } from "@/core/security/infra/pii-keys"
import { prisma } from "@/core/tenancy/infra/prisma"
import { STAFF_LEAD_REASONS, createStaffLead } from "@/modules/acquisition/use-cases/create-staff-lead"
import { createCustomer } from "@/modules/crm/use-cases/create-customer"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { upsertOrderRecipient } from "@/modules/orders/infra/order-recipient-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

const master = piiMasterKey()!
const db = prisma as unknown as PiiBackfillClient

/** Giải một bản mã của tổ chức (đúng như P-5b sẽ đọc). */
async function open(organizationId: string, sealed: string | null): Promise<string | null> {
  if (!sealed) return null
  const version = Number(sealed.split(".")[1])
  const key = await dataKeyByVersion(db, master, organizationId, version)
  return key ? decryptPii(key, sealed) : null
}

/**
 * ADR-014 D-P3, bước P-5a (PO duyệt 07/11/2026, phạm vi A): mọi lệnh ghi cột cá nhân của khách cuối ghi kèm bản mã (khoá
 * dữ liệu riêng của tổ chức) và băm/4 số cuối của SĐT; dữ liệu cũ do job mã hoá theo lô.
 */
describe("mã hoá cột dữ liệu cá nhân — ghi kép", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    resetPiiKeyCache()
    a = await createTenant("tiem-a")
    b = await createTenant("tiem-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("khách: tạo và sửa → bản mã giải ra đúng chữ rõ, băm và 4 số cuối khớp; tổ chức khác dùng khoá khác", async () => {
    const ca = await createCustomer(a.ctx, { name: "Chị Lan", phone: "0912345678", email: "lan@vi-du.test", address: "1 Lê Lợi", notes: "Thích hồng" })
    const cb = await createCustomer(b.ctx, { name: "Chị Lan", phone: "0912345678" })
    const ra = await prisma.customers.findUniqueOrThrow({ where: { id: ca.id } })
    const rb = await prisma.customers.findUniqueOrThrow({ where: { id: cb.id } })
    expect(ra.phone_enc).not.toContain("0912345678")
    expect(await open(a.organizationId, ra.phone_enc)).toBe("0912345678")
    expect(await open(a.organizationId, ra.email_enc)).toBe("lan@vi-du.test")
    expect(await open(a.organizationId, ra.address_enc)).toBe("1 Lê Lợi")
    expect(await open(a.organizationId, ra.notes_enc)).toBe("Thích hồng")
    expect(ra).toMatchObject({ phone_hash: phoneHash(master, a.organizationId, "0912345678"), phone_last4: "5678" })
    expect(rb.phone_hash).not.toBe(ra.phone_hash)
    await expect(open(b.organizationId, ra.phone_enc)).rejects.toThrow() // khoá của tổ chức B không mở được bản mã của A

    await prisma.customers.update({ where: { id: ca.id }, data: { phone: "0987654321", email: null } })
    const after = await prisma.customers.findUniqueOrThrow({ where: { id: ca.id } })
    expect(await open(a.organizationId, after.phone_enc)).toBe("0987654321")
    expect(after).toMatchObject({ email_enc: null, phone_last4: "4321", phone_hash: phoneHash(master, a.organizationId, "0987654321") })
  })

  it("lead, link Thẻ chào, người nhận + hoá đơn VAT của đơn: ghi kèm bản mã", async () => {
    await createStaffLead(a.ctx, { name: "Anh Minh", phone: "0933333333", message: "Gọi buổi chiều", reason: STAFF_LEAD_REASONS[0] })
    const lead = await prisma.leads.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    expect(await open(a.organizationId, lead.phone_enc)).toBe("0933333333")
    expect(await open(a.organizationId, lead.message_enc)).toBe("Gọi buổi chiều")
    expect(lead.phone_last4).toBe("3333")

    const product = await new ProductRepository().create(a.ctx, { code: "P1", name: "Bó P1", attributes: { price: 1 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "c1", name: "C1", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(a.ctx, { catalogId: catalog.id, customerPhone: "0944444444" })
    const session = await prisma.greeting_sessions.findUniqueOrThrow({ where: { id: link.sessionId } })
    expect(await open(a.organizationId, session.customer_phone_enc)).toBe("0944444444")
    expect(session.customer_phone_hash).toBe(phoneHash(master, a.organizationId, "0944444444"))

    const order = await prisma.orders.create({ data: { organization_id: a.organizationId, code: "DH-PII-1", total_vnd: 0, balance_vnd: 0, created_by: "test" } })
    const parts = { houseNumber: "5", street: "Nguyễn Huệ", ward: "Bến Nghé", province: "HCM" }
    await upsertOrderRecipient(prisma, a.organizationId, order.id, { deliveryAddress: { recipientName: "Hoa", phone: "0955555555", street: "5 Nguyễn Huệ", parts } })
    await upsertOrderRecipient(prisma, a.organizationId, order.id, { vat: { vat_company_name: "Cty A", vat_tax_code: "0101", vat_company_address: "9 Lý", vat_email: "kt@a.vn" } })
    const r = await prisma.order_recipients.findUniqueOrThrow({ where: { order_id: order.id } })
    expect(await open(a.organizationId, r.recipient_phone_enc)).toBe("0955555555")
    expect(JSON.parse((await open(a.organizationId, r.address_parts_enc))!)).toEqual({ street: "5 Nguyễn Huệ", parts })
    expect(await open(a.organizationId, r.vat_tax_code_enc)).toBe("0101")
    expect(await open(a.organizationId, r.vat_email_enc)).toBe("kt@a.vn")
  })

  it("lệnh ghi không rõ tổ chức → bản mã để trống (không bao giờ lệch chữ rõ); job mã hoá dữ liệu cũ theo lô, chạy lại không đổi", async () => {
    const c = await createCustomer(a.ctx, { name: "Chị Mai", phone: "0966666666" })
    await prisma.customers.updateMany({ where: { id: c.id }, data: { phone: "0977777777" } }) // ngoài ngữ cảnh tổ chức
    expect(await prisma.customers.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ phone_enc: null, phone_hash: null, phone_last4: "7777" })
    // Dữ liệu có từ trước P-5a: chèn bằng SQL, không qua Prisma
    await prisma.$executeRaw`INSERT INTO customers (id, organization_id, code, name, phone, address, updated_at)
      VALUES ('kh-cu', ${b.organizationId}, 'KH-CU', 'Khách cũ', '0988888888', '7 Hai Bà Trưng', now())`

    expect(await encryptPendingPii(db, { batch: 50 })).toMatchObject({ customers: 2 })
    const fixed = await prisma.customers.findUniqueOrThrow({ where: { id: c.id } })
    expect(await open(a.organizationId, fixed.phone_enc)).toBe("0977777777")
    const old = await prisma.customers.findUniqueOrThrow({ where: { id: "kh-cu" } })
    expect(await open(b.organizationId, old.address_enc)).toBe("7 Hai Bà Trưng")
    expect(old.phone_hash).toBe(phoneHash(master, b.organizationId, "0988888888"))
    expect(await encryptPendingPii(db, { batch: 50 })).toMatchObject({ customers: 0 })

    // SĐT không có chữ số (dữ liệu bẩn): xử lý một lần, không bị chọn lại mãi
    await prisma.$executeRaw`UPDATE customers SET phone = 'không rõ', phone_enc = NULL, phone_hash = NULL WHERE id = 'kh-cu'`
    expect(await encryptPendingPii(db, { batch: 50 })).toMatchObject({ customers: 1 })
    expect(await encryptPendingPii(db, { batch: 50 })).toMatchObject({ customers: 0 })
  })

  it("khoá dữ liệu: một khoá mỗi tổ chức, lưu dạng bọc; tổ chức khác không đọc được qua ngữ cảnh tổ chức", async () => {
    const ka = await currentDataKey(db, master, a.organizationId)
    resetPiiKeyCache()
    expect((await currentDataKey(db, master, a.organizationId)).key.equals(ka.key)).toBe(true)
    const rows = await prisma.tenant_data_keys.findMany({ where: { organization_id: a.organizationId } })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.wrapped_key).not.toContain(ka.key.toString("base64url"))
  })

  it("mọi cột của PII_FIELDS có trong lược đồ", () => {
    const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8")
    for (const [model, fields] of Object.entries(PII_FIELDS)) {
      const body = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ""
      for (const [field, spec] of Object.entries(fields)) {
        for (const col of [field, ...Object.values(spec).filter((v): v is string => typeof v === "string")]) {
          expect(body, `${model}.${col}`).toMatch(new RegExp(`\\n\\s+${col}\\s`))
        }
      }
    }
  })
})
