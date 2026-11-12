import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { resetPiiKeyCache } from "@/core/security/infra/pii-keys"
import { prisma } from "@/core/tenancy/infra/prisma"
import { upsertOrderRecipient } from "@/modules/orders/infra/order-recipient-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-014 D-P3: yêu cầu đầu tiên vào `orders` khi bộ nhớ đệm khoá còn nguội (tiến trình mới) vẫn phải giải mã được
 * `order_recipients` — khoá phải được nạp trước khi query extension của `orders` giải mã bản mã lồng.
 */
describe("dữ liệu cá nhân — đọc đơn khi bộ nhớ đệm khoá nguội", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    resetPiiKeyCache()
    a = await createTenant("tiem-nguoi")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function seed() {
    const order = await prisma.orders.create({ data: { organization_id: a.organizationId, code: "DH-C1", total_vnd: 0, balance_vnd: 0, created_by: "t" } })
    await upsertOrderRecipient(prisma, a.organizationId, order.id, { deliveryAddress: { recipientName: "Hoa", phone: "0955555555", street: "5 Nguyễn Huệ", parts: { houseNumber: "5", street: "Nguyễn Huệ", ward: "Bến Nghé", province: "HCM" } } })
    resetPiiKeyCache()
    return order.id
  }

  it("findMany chọn delivery_address (không quan hệ nào khác mang bản mã) vẫn trả địa chỉ giải mã", async () => {
    const id = await seed()
    const rows = await prisma.orders.findMany({ where: { id }, select: { id: true, delivery_address: true } })
    expect(rows[0]!.delivery_address).toMatchObject({ recipientName: "Hoa", phone: "0955555555" })
  })

  it("findUnique / findFirst không select (lấy mọi cột) cũng giải mã được", async () => {
    const id = await seed()
    expect((await prisma.orders.findUniqueOrThrow({ where: { id } })).delivery_address).toMatchObject({ phone: "0955555555" })
    resetPiiKeyCache()
    expect((await prisma.orders.findFirstOrThrow({ where: { id } })).delivery_address).toMatchObject({ phone: "0955555555" })
  })
})
