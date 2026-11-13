import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createBlock } from "@/app/api/v1/availability/blocks/route"
import { AvailabilityRepository } from "@/modules/availability/infra/availability-repository"
import { ProductBookingRepository } from "@/modules/greeting-card/infra/product-booking-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * `product_bookings` từng lưu ngày dạng chuỗi, trạng thái tự do, không khoá ngoại sang đơn
 * (rà soát M5, 22/10/2026). Giờ: cột DATE, enum `booking_status`, FK `order_id → orders`.
 */
describe("product_bookings có kiểu dữ liệu chặt", () => {
  let a: Tenant
  let productId: string
  const repo = new AvailabilityRepository()

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    productId = (await prisma.products.create({
      data: { organization_id: a.organizationId, code: "ROOM-1", name: "Phòng 1", status: "ACTIVE" },
    })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("ghi YYYY-MM-DD, CSDL lưu DATE, đọc ra đúng chuỗi cũ ở cả hai repository", async () => {
    const id = await repo.createBooking({
      organizationId: a.organizationId, productId, checkInDate: "2026-12-30", checkOutDate: "2027-01-02",
    })
    const [raw] = await prisma.$queryRaw<Array<{ t: string }>>`SELECT pg_typeof(check_in_date)::text AS t FROM product_bookings WHERE id = ${id}`
    expect(raw?.t).toBe("date")

    const listed = await repo.listBookings(a.organizationId, "2026-12-01", "2027-01-31")
    expect(listed.map((b) => [b.checkInDate, b.checkOutDate, b.status])).toEqual([["2026-12-30", "2027-01-02", "ACTIVE"]])

    const spans = await new ProductBookingRepository().getActiveBookings(a.organizationId, productId, "2026-12-01", "2027-01-31")
    expect(spans).toEqual([{ checkInDate: "2026-12-30", checkOutDate: "2027-01-02" }])
  })

  it("ngày không có thật trên lịch (đúng định dạng) → 422, không ghi dòng nào", async () => {
    const res = await createBlock(
      withSession("http://localhost/api/v1/availability/blocks", a.token, {
        method: "POST",
        body: JSON.stringify({ product_id: productId, check_in_date: "2026-02-30", check_out_date: "2026-03-02" }),
      })
    )
    expect(res.status).toBe(422)
    expect(await prisma.product_bookings.count()).toBe(0)
  })

  it("order_id phải là đơn có thật; xoá đơn thì đặt chỗ của đơn đi theo, khoá thủ công ở lại", async () => {
    await expect(
      repo.createBooking({ organizationId: a.organizationId, productId, orderId: "khong-co-don-nay", checkInDate: "2026-11-01", checkOutDate: "2026-11-02" })
    ).rejects.toThrow()

    const order = await prisma.orders.create({
      data: { organization_id: a.organizationId, code: "DH-1", total_vnd: 100, balance_vnd: 100, created_by: a.userId },
    })
    await repo.createBooking({ organizationId: a.organizationId, productId, orderId: order.id, checkInDate: "2026-11-05", checkOutDate: "2026-11-07" })
    await repo.createBooking({ organizationId: a.organizationId, productId, checkInDate: "2026-11-10", checkOutDate: "2026-11-12", note: "Bảo trì" })

    await prisma.orders.delete({ where: { id: order.id } })
    const left = await prisma.product_bookings.findMany({ select: { order_id: true, note: true } })
    expect(left).toEqual([{ order_id: null, note: "Bảo trì" }])
  })
})
