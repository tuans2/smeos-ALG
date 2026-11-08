import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { encryptPendingPii, type PiiBackfillClient } from "@/core/security/infra/pii-backfill"
import { resetPiiKeyCache } from "@/core/security/infra/pii-keys"
import { prisma } from "@/core/tenancy/infra/prisma"
import { createCustomer } from "@/modules/crm/use-cases/create-customer"
import { findCustomerForOrders, listOrdersOfCustomer } from "@/modules/orders/infra/customer-orders-query"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Khối chốt `P5D-VERIFY` của migration P-5d-2 (CSDL test dựng bằng `db push`, không chạy migration). */
function verifyBlock(): string {
  const dir = path.join(process.cwd(), "prisma/migrations")
  const migration = readdirSync(dir).find((d) => d.endsWith("_pii_encryption_cleanup"))!
  const sql = readFileSync(path.join(dir, migration, "migration.sql"), "utf8").match(/-- P5D-VERIFY-BEGIN[\s\S]*?-- P5D-VERIFY-END/)?.[0]
  if (!sql) throw new Error("Thiếu khối P5D-VERIFY")
  return sql.replace(/^--.*$/gm, "").trim().replace(/;$/, "")
}
const verify = () => prisma.$executeRawUnsafe(verifyBlock())

/**
 * ADR-014 D-P3, P-5d-2: xoá bản sao `*_enc` và bỏ nhánh tra `metadata.customerPhone` — chỉ khi không còn đơn điều phối nào
 * giữ SĐT khách lẻ trong `metadata`; còn → dừng, thông báo không lộ số. Sau job, "đơn của khách" vẫn ra đơn đó (theo băm).
 */
describe("P-5d-2 — chốt trước khi dọn", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    resetPiiKeyCache()
    a = await createTenant("tiem-a")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("còn SĐT khách lẻ trong metadata → dừng, không lộ số; job tách xong → qua; đơn của khách vẫn tìm ra theo băm", async () => {
    const order = await prisma.orders.create({ data: { organization_id: a.organizationId, code: "DH-D1", total_vnd: 0, balance_vnd: 0, created_by: "t" } })
    // Đơn điều phối do bản trước P-5c ghi: SĐT khách lẻ còn trong `metadata` (SQL thô — client tách khoá này khi ghi)
    await prisma.$executeRaw`INSERT INTO order_coordinations (id, organization_id, order_id, metadata, updated_at)
      VALUES ('dp-cu', ${a.organizationId}, ${order.id}, '{"customerName":"Khách lẻ","customerPhone":"0911111111"}'::jsonb, now())`

    const err = await verify().then(() => new Error("không dừng"), (e: unknown) => e as Error)
    expect(err.message).toMatch(/P-5d: dừng.*order_coordinations: 1 đơn/)
    expect(err.message).not.toContain("0911111111")

    await encryptPendingPii(prisma as unknown as PiiBackfillClient, { batch: 50 })
    await expect(verify()).resolves.toBe(0)

    const customer = await createCustomer(a.ctx, { name: "Khách lẻ", phone: "0911 111 111" })
    const found = await findCustomerForOrders(a.ctx, customer.id)
    expect((await listOrdersOfCustomer(a.ctx, found!)).map((o) => o.id)).toEqual([order.id])
  })
})
