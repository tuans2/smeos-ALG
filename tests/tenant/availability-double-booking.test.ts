import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createBlock } from "@/app/api/v1/availability/blocks/route"
import { AvailabilityRepository } from "@/modules/availability/infra/availability-repository"
import { assertBookingDatesAvailable } from "@/modules/availability/use-cases/bind-order-booking"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Homestay: hai khách thanh toán cùng lúc từng cùng giữ được một phòng (không kiểm chồng lịch,
 * không khoá) — rà soát 21/10/2026, H8.
 */
describe("chống đặt trùng phòng", () => {
  let a: Tenant
  let productId: string

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

  const span = (checkInDate: string, checkOutDate: string) => ({
    organizationId: a.organizationId, productId, checkInDate, checkOutDate,
  })

  it("10 lượt giữ cùng khoảng ngày chạy đồng thời: đúng 1 lượt thành công", async () => {
    const repo = new AvailabilityRepository()
    const results = await Promise.all(
      Array.from({ length: 10 }, () => repo.createBooking(span("2026-12-01", "2026-12-03")))
    )
    expect(results.filter((id) => id !== null)).toHaveLength(1)
    expect(await prisma.product_bookings.count({ where: { product_id: productId, status: "ACTIVE" } })).toBe(1)
  })

  it("chồng một phần bị chặn; liền kề (ngày ra = ngày vào) được phép; booking đã huỷ không chặn", async () => {
    const repo = new AvailabilityRepository()
    const first = await repo.createBooking(span("2026-12-01", "2026-12-03"))
    expect(first).not.toBeNull()
    expect(await repo.createBooking(span("2026-12-02", "2026-12-05"))).toBeNull()
    expect(await repo.createBooking(span("2026-12-03", "2026-12-04"))).not.toBeNull()

    await prisma.product_bookings.update({ where: { id: first! }, data: { status: "CANCELLED" } })
    expect(await repo.createBooking(span("2026-12-01", "2026-12-02"))).not.toBeNull()
  })

  it("kiểm trước khi tạo đơn: khoảng ngày đã có người giữ → 409", async () => {
    await new AvailabilityRepository().createBooking(span("2026-12-10", "2026-12-12"))
    await expect(assertBookingDatesAvailable(span("2026-12-11", "2026-12-13"))).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(assertBookingDatesAvailable(span("2026-12-12", "2026-12-13"))).resolves.toBeUndefined()
  })

  it("khoá ngày thủ công chồng lên đặt chỗ có sẵn → 409", async () => {
    await new AvailabilityRepository().createBooking(span("2026-12-20", "2026-12-22"))
    const res = await createBlock(withSession("http://localhost/api/v1/availability/blocks", a.token, {
      method: "POST",
      body: JSON.stringify({ product_id: productId, check_in_date: "2026-12-21", check_out_date: "2026-12-23" }),
    }))
    expect(res.status).toBe(409)
  })
})
