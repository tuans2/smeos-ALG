import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createQuotation } from "@/app/api/v1/quotations/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** PO 12/11/2026 (audit BL-28): Sale giảm quá mức tự quyết của tiệm → 422; Điều hành lưu được tới trần 50% tiền hàng. */
describe("trần chiết khấu báo giá qua route", () => {
  let a: Tenant
  let sale: { userId: string; token: string }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("giam-gia")
    sale = await addStaffWithSession(a, "sale", "lan")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const post = (token: string, discountAmount: number) =>
    createQuotation(withSession("http://localhost/api/v1/quotations", token, {
      method: "POST", body: JSON.stringify({ items: [{ name: "Bó hoa", qty: 1, unitPrice: 1_000_000 }], discount_amount: discountAmount }),
    }))

  it("Sale: trong 20% mặc định được, quá 20% → 422; chủ tiệm (C10) được tới 50%, quá 50% → 422", async () => {
    expect((await post(sale.token, 200_000)).status).toBe(201)
    expect((await post(sale.token, 300_000)).status).toBe(422)
    expect((await post(a.token, 450_000)).status).toBe(201)
    expect((await post(a.token, 600_000)).status).toBe(422)
  })

  it("tiệm hạ mức Sale xuống 10% → Sale giảm 15% bị chặn", async () => {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { order_discount: { sale_max_percent: 10 } } } })
    expect((await post(sale.token, 150_000)).status).toBe(422)
    expect((await post(sale.token, 100_000)).status).toBe(201)
  })
})
