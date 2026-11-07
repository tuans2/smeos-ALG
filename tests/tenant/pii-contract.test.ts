import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { resetPiiKeyCache } from "@/core/security/infra/pii-keys"
import { prisma } from "@/core/tenancy/infra/prisma"
import { createCustomer } from "@/modules/crm/use-cases/create-customer"
import { upsertOrderRecipient } from "@/modules/orders/infra/order-recipient-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Các lệnh của khối `tag` trong migration P-5c (CSDL test dựng bằng `db push`, không chạy migration). */
function block(tag: string): string[] {
  const dir = path.join(process.cwd(), "prisma/migrations")
  const migration = readdirSync(dir).find((d) => d.endsWith("_pii_encryption_contract"))!
  const sql = readFileSync(path.join(dir, migration, "migration.sql"), "utf8").match(new RegExp(`-- ${tag}-BEGIN[\\s\\S]*?-- ${tag}-END`))?.[0]
  if (!sql) throw new Error(`Thiếu khối ${tag}`)
  const body = sql.replace(/^--.*$/gm, "")
  // Khối DO `$$ … $$` là một lệnh; còn lại tách theo `;` cuối dòng
  return body.includes("$$") ? [body.trim().replace(/;$/, "")] : body.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)
}
const replay = (stmts: string[]) => prisma.$transaction(async (tx) => { for (const stmt of stmts) await tx.$executeRawUnsafe(stmt) })

/**
 * ADR-014 D-P3, P-5c (contract): migration chép bản mã đè lên cột rõ — chỉ khi mọi giá trị đã có bản mã/băm và không có
 * hai khách cùng số trong một tổ chức; thiếu → dừng, cả giao dịch cuộn lại.
 */
describe("P-5c — chốt rồi chép bản mã đè cột rõ", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    resetPiiKeyCache()
    a = await createTenant("tiem-a")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("dữ liệu như sau P-5b (cột rõ + `*_enc`) → sau migration cột chỉ còn bản mã, đọc ra đúng", async () => {
    const c = await createCustomer(a.ctx, { name: "Chị Lan", phone: "0912345678", email: "lan@vi-du.test" })
    const order = await prisma.orders.create({ data: { organization_id: a.organizationId, code: "DH-C1", total_vnd: 0, balance_vnd: 0, created_by: "t" } })
    const parts = { street: "5 Nguyễn Huệ" }
    await upsertOrderRecipient(prisma, a.organizationId, order.id, { deliveryAddress: { recipientName: "Hoa", phone: "0955555555", street: "5 Nguyễn Huệ", parts } })
    // Trạng thái P-5b: chữ rõ ở cột chính, bản mã ở `*_enc`
    await prisma.$executeRaw`UPDATE customers SET phone = '0912345678', email = 'lan@vi-du.test' WHERE id = ${c.id}`
    await prisma.$executeRaw`UPDATE order_recipients SET recipient_phone = '0955555555', address_parts = ${JSON.stringify({ street: "5 Nguyễn Huệ", parts })}::jsonb WHERE order_id = ${order.id}`

    await replay([...block("P5C-VERIFY"), ...block("P5C-INPLACE")])

    const raw = await prisma.$queryRaw<Array<{ phone: string; phone_enc: string; email: string }>>`SELECT phone, phone_enc, email FROM customers WHERE id = ${c.id}`
    expect(raw[0]!.phone).toBe(raw[0]!.phone_enc)
    expect(JSON.stringify(raw)).not.toMatch(/0912345678|lan@vi-du/)
    const rawR = await prisma.$queryRaw<Array<{ p: unknown }>>`SELECT address_parts AS p FROM order_recipients WHERE order_id = ${order.id}`
    expect(rawR[0]!.p).toMatch(/^pii1\./)
    resetPiiKeyCache()
    expect(await prisma.customers.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ phone: "0912345678", email: "lan@vi-du.test" })
    expect(await prisma.order_recipients.findUniqueOrThrow({ where: { order_id: order.id } })).toMatchObject({ recipient_phone: "0955555555", address_parts: { street: "5 Nguyễn Huệ", parts } })
  })

  it("còn dòng chưa mã hoá hoặc khách trùng số → dừng, không đổi gì; thông báo không chứa dữ liệu", async () => {
    await prisma.$executeRaw`INSERT INTO customers (id, organization_id, code, name, phone, updated_at) VALUES ('kh-cu', ${a.organizationId}, 'KH-CU', 'Khách cũ', '0988888888', now())`
    const err = (await replay(block("P5C-VERIFY")).then(() => new Error("không dừng"), (e: unknown) => e as Error))
    expect(err.message).toMatch(/P-5c: dừng.*customers\.phone: 1 dòng/)
    expect(err.message).not.toContain("0988888888")
    await prisma.$executeRaw`DELETE FROM customers WHERE id = 'kh-cu'`

    const c = await createCustomer(a.ctx, { name: "Chị Lan", phone: "0912345678" })
    await expect(replay([
      `DROP INDEX "customers_organization_id_phone_hash_key"`,
      `INSERT INTO customers (id, organization_id, code, name, phone, phone_enc, phone_hash, updated_at)
        SELECT 'kh-trung', organization_id, 'KH-TRUNG', 'Trùng', phone, phone_enc, phone_hash, now() FROM customers WHERE id = '${c.id}'`,
      ...block("P5C-VERIFY"),
    ])).rejects.toThrow(/1 nhóm khách trùng số/)
    expect(await prisma.customers.count()).toBe(1) // cuộn lại cả lệnh bỏ ràng buộc
    await expect(replay(block("P5C-VERIFY"))).resolves.toBeUndefined()
  })
})
