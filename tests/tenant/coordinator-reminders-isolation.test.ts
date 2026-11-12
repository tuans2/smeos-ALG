import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { POST as acknowledgePost } from "@/app/api/v1/coordinator/reminders/acknowledge/route"
import {
  GET as templateRemindersGet,
  PUT as templateRemindersPut,
} from "@/app/api/v1/coordinator/templates/[id]/reminders/route"

/**
 * Nhắc việc Điều phối: mọi id đơn/mẫu hoa của cửa hàng khác → 404, không bao giờ
 * "xác nhận" giả hay trả cấu hình rỗng như thể mẫu hoa có thật.
 */
describe("coordinator reminders: cách ly giữa các cửa hàng", () => {
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

  function params(id: string) {
    return { params: Promise.resolve({ id }) }
  }

  it("xác nhận mốc nhắc việc cho đơn của cửa hàng khác → 404", async () => {
    const orderId = randomUUID()
    await prisma.orders.create({
      data: {
        id: orderId, organization_id: a.organizationId, code: "DH-A-1", source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 100_000, paid_vnd: 100_000, balance_vnd: 0, created_by: "test",
      },
    })
    const body = JSON.stringify({ order_id: orderId, milestone: "M0", action: "ACKNOWLEDGED" })
    const init = { method: "POST", body, headers: { "content-type": "application/json" } }

    const res = await acknowledgePost(withSession("http://localhost/api/v1/coordinator/reminders/acknowledge", b.token, init))
    expect(res.status).toBe(404)

    const own = await acknowledgePost(withSession("http://localhost/api/v1/coordinator/reminders/acknowledge", a.token, init))
    expect(own.status).toBe(200)
  })

  it("đọc/ghi nhắc việc theo mẫu hoa của cửa hàng khác → 404, không ghi đè", async () => {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const url = `http://localhost/api/v1/coordinator/templates/${product.id}/reminders`

    const read = await templateRemindersGet(withSession(url, b.token), params(product.id))
    expect(read.status).toBe(404)

    const write = await templateRemindersPut(
      withSession(url, b.token, { method: "PUT", body: JSON.stringify({ m0MinutesAfterPaid: 5 }), headers: { "content-type": "application/json" } }),
      params(product.id),
    )
    expect(write.status).toBe(404)
    const after = await prisma.products.findUniqueOrThrow({ where: { id: product.id } })
    expect((after.attributes as Record<string, unknown>).coordinator_reminder_overrides).toBeUndefined()

    const ownRead = await templateRemindersGet(withSession(url, a.token), params(product.id))
    expect(ownRead.status).toBe(200)
  })
})
