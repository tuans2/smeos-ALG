import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as patchProduct } from "@/app/api/v1/products/[id]/route"
import { POST as checkAvailability } from "@/app/api/v1/public/greeting-catalog/[id]/check-availability/route"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { assertProductDateOpen } from "@/modules/greeting-card/use-cases/assert-product-date-open"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 2.8 — mẫu hoa khoá ngày 14/02 không đặt được cho ngày đó, ngày khác vẫn đặt. */

describe("khoá mẫu theo ngày giao", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("Điều hành chặn ngày cho mẫu hoa (chế độ tồn kho) → link khách báo hết ngày đó, đặt đơn ngày đó bị từ chối", async () => {
    const p = await prisma.products.create({ data: { organization_id: a.organizationId, code: "SP-1", name: "Bó hồng", status: "ACTIVE" } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: `bo-${randomUUID().slice(0, 6)}`, name: "Bộ", productIds: [p.id], createdBy: a.userId })

    const patch = (token: string) => patchProduct(withSession(`http://localhost/api/v1/products/${p.id}`, token, {
      method: "PATCH", body: JSON.stringify({ availability_config: { mode: "STOCK_QUANTITY", maxQuantity: null, manualBlockedDates: ["2027-02-14"] } }),
    }), { params: Promise.resolve({ id: p.id }) })
    expect((await patch(b.token)).status).toBe(404)
    expect((await patch(a.token)).status).toBe(200)

    const check = async (deliveryDate: string) => {
      const res = await checkAvailability(new Request(`http://localhost/api/v1/public/greeting-catalog/${catalog.id}/check-availability`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: p.id, deliveryDate }),
      }), { params: Promise.resolve({ id: catalog.id }) })
      expect(res.status).toBe(200)
      return ((await res.json()) as { available: boolean }).available
    }
    expect(await check("2027-02-14")).toBe(false)
    expect(await check("2027-02-15")).toBe(true)

    await expect(assertProductDateOpen(a.organizationId, p.id, "2027-02-14")).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(assertProductDateOpen(a.organizationId, p.id, "2027-02-15")).resolves.toBeUndefined()
    // Mẫu của tổ chức khác không bị ảnh hưởng bởi cấu hình này
    await expect(assertProductDateOpen(b.organizationId, p.id, "2027-02-14")).resolves.toBeUndefined()
  })
})
