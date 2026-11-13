import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as checkAvailability } from "@/app/api/v1/public/greeting-catalog/[id]/check-availability/route"
import { AvailabilityRepository } from "@/modules/availability/infra/availability-repository"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Ngành quyết định chế độ khả dụng mặc định (homestay = lịch phòng). Client gửi `industryKey` khác
 * từng đổi được chế độ — phòng đã có người đặt vẫn hiện "còn trống" (rà soát cụm E, 22/10/2026).
 */
describe("kiểm khả dụng công khai theo ngành của tiệm", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { industry_key: "HOMESTAY" } }) // T-6c-2: ngành chỉ ở cột
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("phòng đã đặt: client gửi ngành khác vẫn bị kiểm theo lịch phòng", async () => {
    const product = await prisma.products.create({ data: { organization_id: a.organizationId, code: "ROOM-1", name: "Phòng 1", status: "ACTIVE" } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: `bo-${randomUUID().slice(0, 6)}`, name: "Phòng", productIds: [product.id], createdBy: a.userId })
    await new AvailabilityRepository().createBooking({ organizationId: a.organizationId, productId: product.id, checkInDate: "2027-01-10", checkOutDate: "2027-01-12" })

    const check = (industryKey?: string) =>
      checkAvailability(
        new Request(`http://localhost/api/v1/public/greeting-catalog/${catalog.id}/check-availability`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId: product.id, checkInDate: "2027-01-10", checkOutDate: "2027-01-11", ...(industryKey ? { industryKey } : {}) }),
        }),
        { params: Promise.resolve({ id: catalog.id }) }
      )
    for (const key of [undefined, "FLORAL"]) {
      const res = await check(key)
      expect(res.status, String(key)).toBe(200)
      expect(((await res.json()) as { available: boolean }).available, String(key)).toBe(false)
    }
  })
})
