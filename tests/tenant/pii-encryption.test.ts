import { readFileSync } from "node:fs"
import path from "node:path"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { decryptPii, phoneHash, piiMasterKey, requirePiiMasterKey } from "@/core/security/pii-cipher"
import { PII_FIELDS } from "@/core/security/pii-fields"
import { encryptPendingPii, type PiiBackfillClient } from "@/core/security/infra/pii-backfill"
import { currentDataKey, dataKeyByVersion, resetPiiKeyCache } from "@/core/security/infra/pii-keys"
import { PiiOrganizationUnknownError } from "@/core/security/infra/pii-write"
import { prisma } from "@/core/tenancy/infra/prisma"
import { STAFF_LEAD_REASONS, createStaffLead } from "@/modules/acquisition/use-cases/create-staff-lead"
import { createCoordinatorOrder } from "@/modules/coordinator/use-cases/create-coordinator-order"
import { createCustomer } from "@/modules/crm/use-cases/create-customer"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { upsertOrderRecipient } from "@/modules/orders/infra/order-recipient-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

const master = piiMasterKey()!
const db = prisma as unknown as PiiBackfillClient

/** Giải một bản mã của tổ chức bằng khoá trong CSDL (không qua client). */
async function open(organizationId: string, sealed: unknown): Promise<string | null> {
  if (typeof sealed !== "string" || !sealed) return null
  const version = Number(sealed.split(".")[1])
  const key = await dataKeyByVersion(db, master, organizationId, version)
  return key ? decryptPii(key, sealed) : null
}

/** Giá trị đang lưu trong CSDL (SQL thô — không qua phần giải mã của client). */
async function stored(table: string, id: string, columns: string[], pk = "id"): Promise<Record<string, unknown>> {
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${table}" WHERE "${pk}" = $1`, id)
  return rows[0] ?? {}
}

/**
 * ADR-014 D-P3, P-5a → P-5c (PO duyệt 07/11/2026, phạm vi A): cột dữ liệu cá nhân của khách cuối chỉ chứa bản mã (khoá
 * dữ liệu riêng của tổ chức), số điện thoại có băm và 4 số cuối; đọc qua client ra chữ rõ; dữ liệu còn chữ rõ do job mã hoá.
 */
describe("mã hoá cột dữ liệu cá nhân — lưu bản mã", () => {
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

  it("khách: cột chỉ còn bản mã, giải ra đúng; băm/4 số cuối khớp; tổ chức khác dùng khoá khác; sửa → bản mã mới", async () => {
    const ca = await createCustomer(a.ctx, { name: "Chị Lan", phone: "0912345678", email: "lan@vi-du.test", address: "1 Lê Lợi", notes: "Thích hồng" })
    const cb = await createCustomer(b.ctx, { name: "Chị Lan", phone: "0912345678" })
    const ra = await stored("customers", ca.id, ["phone", "phone_enc", "email", "address", "notes", "phone_hash", "phone_last4"])
    const rb = await stored("customers", cb.id, ["phone_hash"])
    expect(JSON.stringify(ra)).not.toMatch(/0912345678|lan@vi-du|Lê Lợi|Thích hồng/)
    expect(ra.phone_enc).toBe(ra.phone) // bản sao cho quay lại P-5b
    expect(await open(a.organizationId, ra.phone)).toBe("0912345678")
    expect(await open(a.organizationId, ra.email)).toBe("lan@vi-du.test")
    expect(await open(a.organizationId, ra.address)).toBe("1 Lê Lợi")
    expect(await open(a.organizationId, ra.notes)).toBe("Thích hồng")
    expect(ra).toMatchObject({ phone_hash: phoneHash(master, a.organizationId, "0912345678"), phone_last4: "5678" })
    expect(rb.phone_hash).not.toBe(ra.phone_hash)
    await expect(open(b.organizationId, ra.phone)).rejects.toThrow() // khoá của tổ chức B không mở được bản mã của A
    expect(await prisma.customers.findUniqueOrThrow({ where: { id: ca.id } })).toMatchObject({ phone: "0912345678", email: "lan@vi-du.test" })

    await prisma.customers.update({ where: { id: ca.id }, data: { phone: "0987654321", email: null } })
    const after = await stored("customers", ca.id, ["phone", "email", "email_enc", "phone_hash", "phone_last4"])
    expect(await open(a.organizationId, after.phone)).toBe("0987654321")
    expect(after).toMatchObject({ email: null, email_enc: null, phone_last4: "4321", phone_hash: phoneHash(master, a.organizationId, "0987654321") })
  })

  it("lead, link Thẻ chào, người nhận + VAT, đơn điều phối: lưu bản mã; SĐT khách lẻ tách khỏi metadata, đọc vẫn có", async () => {
    await createStaffLead(a.ctx, { name: "Anh Minh", phone: "0933333333", message: "Gọi buổi chiều", reason: STAFF_LEAD_REASONS[0] })
    const lead = await prisma.leads.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    const rawLead = await stored("leads", lead.id, ["phone", "message", "phone_last4"])
    expect(await open(a.organizationId, rawLead.phone)).toBe("0933333333")
    expect(await open(a.organizationId, rawLead.message)).toBe("Gọi buổi chiều")
    expect(rawLead.phone_last4).toBe("3333")

    const product = await new ProductRepository().create(a.ctx, { code: "P1", name: "Bó P1", attributes: { price: 1 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "c1", name: "C1", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(a.ctx, { catalogId: catalog.id, customerPhone: "0944444444" })
    const session = await stored("greeting_sessions", link.sessionId, ["customer_phone", "customer_phone_hash"])
    expect(await open(a.organizationId, session.customer_phone)).toBe("0944444444")
    expect(session.customer_phone_hash).toBe(phoneHash(master, a.organizationId, "0944444444"))

    const order = await prisma.orders.create({ data: { organization_id: a.organizationId, code: "DH-PII-1", total_vnd: 0, balance_vnd: 0, created_by: "test" } })
    const parts = { houseNumber: "5", street: "Nguyễn Huệ", ward: "Bến Nghé", province: "HCM" }
    await upsertOrderRecipient(prisma, a.organizationId, order.id, { deliveryAddress: { recipientName: "Hoa", phone: "0955555555", street: "5 Nguyễn Huệ", parts } })
    await upsertOrderRecipient(prisma, a.organizationId, order.id, { vat: { vat_company_name: "Cty A", vat_tax_code: "0101", vat_company_address: "9 Lý", vat_email: "kt@a.vn" } })
    const r = await stored("order_recipients", order.id, ["recipient_phone", "address_parts", "vat_tax_code", "vat_email"], "order_id")
    expect(JSON.stringify(r)).not.toMatch(/0955555555|Nguyễn Huệ|0101|kt@a/)
    expect(await open(a.organizationId, r.recipient_phone)).toBe("0955555555")
    expect(JSON.parse((await open(a.organizationId, r.address_parts))!)).toEqual({ street: "5 Nguyễn Huệ", parts })
    expect(await prisma.order_recipients.findUniqueOrThrow({ where: { order_id: order.id } })).toMatchObject({ address_parts: { street: "5 Nguyễn Huệ", parts }, vat_email: "kt@a.vn" })

    const view = await createCoordinatorOrder(a.ctx, {
      customerName: "Khách lẻ", customerPhone: "0966 666 666", recipientName: "Bình", recipientPhone: "0901234567",
      deliveryAddress: { street: "1 Phố Huế" }, deliveryTargetTime: "17:00 hôm nay", productTitle: "Bó hồng", unitPriceVnd: 100_000, flowers: [],
    })
    const coord = await prisma.order_coordinations.findFirstOrThrow({ where: { order_id: view.id } })
    const rawCoord = await stored("order_coordinations", coord.id, ["metadata", "customer_phone", "customer_phone_hash"])
    expect(JSON.stringify(rawCoord.metadata)).not.toContain("666")
    expect(await open(a.organizationId, rawCoord.customer_phone)).toBe("0966 666 666")
    expect(rawCoord.customer_phone_hash).toBe(phoneHash(master, a.organizationId, "0966666666"))
    expect(coord.metadata).toMatchObject({ customerName: "Khách lẻ", customerPhone: "0966 666 666" })
  })

  it("lệnh ghi không rõ tổ chức: một tổ chức → tra ra; nhiều tổ chức → lỗi, không ghi chữ rõ; thiếu khoá chủ → lỗi", async () => {
    const ca = await createCustomer(a.ctx, { name: "Chị Mai", phone: "0966666666" })
    const cb = await createCustomer(b.ctx, { name: "Chị Đào", phone: "0977777777" })
    await prisma.customers.updateMany({ where: { id: ca.id }, data: { address: "3 Hàm Nghi" } }) // ngoài ngữ cảnh tổ chức
    expect(await open(a.organizationId, (await stored("customers", ca.id, ["address"])).address)).toBe("3 Hàm Nghi")
    await expect(prisma.customers.updateMany({ where: { id: { in: [ca.id, cb.id] } }, data: { address: "x" } })).rejects.toBeInstanceOf(PiiOrganizationUnknownError)
    expect(await prisma.customers.updateMany({ where: { id: "khong-co" }, data: { address: "x" } })).toEqual({ count: 0 })
    expect(() => requirePiiMasterKey({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow(/PII_ENCRYPTION_KEY/)
  })

  it("job: dòng còn chữ rõ (SQL thô, bản cũ ghi lúc deploy) và SĐT trong metadata → mã hoá, băm; chạy lại không đổi", async () => {
    await prisma.$executeRaw`INSERT INTO customers (id, organization_id, code, name, phone, address, updated_at)
      VALUES ('kh-cu', ${b.organizationId}, 'KH-CU', 'Khách cũ', '0988888888', '7 Hai Bà Trưng', now())`
    const order = await prisma.orders.create({ data: { organization_id: a.organizationId, code: "DH-PII-2", total_vnd: 0, balance_vnd: 0, created_by: "test" } })
    await prisma.$executeRaw`INSERT INTO order_coordinations (id, organization_id, order_id, metadata, updated_at)
      VALUES ('dp-cu', ${a.organizationId}, ${order.id}, '{"customerName":"Khách lẻ","customerPhone":"0911111111"}'::jsonb, now())`
    await prisma.$executeRaw`INSERT INTO customers (id, organization_id, code, name, phone, updated_at)
      VALUES ('kh-ban', ${b.organizationId}, 'KH-BAN', 'Dữ liệu bẩn', 'không rõ', now())`

    expect(await encryptPendingPii(db, { batch: 50 })).toMatchObject({ customers: 2, order_coordinations: 1 })
    const old = await stored("customers", "kh-cu", ["phone", "address", "phone_hash"])
    expect(await open(b.organizationId, old.phone)).toBe("0988888888")
    expect(await open(b.organizationId, old.address)).toBe("7 Hai Bà Trưng")
    expect(old.phone_hash).toBe(phoneHash(master, b.organizationId, "0988888888"))
    const coord = await stored("order_coordinations", "dp-cu", ["metadata", "customer_phone"])
    expect(coord.metadata).toEqual({ customerName: "Khách lẻ" })
    expect(await open(a.organizationId, coord.customer_phone)).toBe("0911111111")
    expect((await prisma.order_coordinations.findUniqueOrThrow({ where: { id: "dp-cu" } })).metadata).toEqual({ customerName: "Khách lẻ", customerPhone: "0911111111" })
    expect((await stored("customers", "kh-ban", ["phone_hash"])).phone_hash).toBe("") // không có chữ số: xử lý một lần
    expect(await encryptPendingPii(db, { batch: 50 })).toMatchObject({ customers: 0, order_coordinations: 0 })
  })

  it("khoá dữ liệu: một khoá mỗi tổ chức, lưu dạng bọc", async () => {
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
