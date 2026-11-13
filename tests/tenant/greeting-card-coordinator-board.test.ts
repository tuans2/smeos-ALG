import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { getCoordinatorBoard } from "@/modules/greeting-card/use-cases/coordinator-board"
import { getCoordinatorWork } from "@/modules/greeting-card/use-cases/coordinator-work"

/**
 * Đợt 2-G (PO 08/10/2026): bảng Điều phối thấy ĐỦ đơn còn việc (trước đây chỉ 20 đơn mới nhất), xếp
 * theo ngày + giờ giao; đơn huỷ và đơn giao xong quá 24 giờ không hiện; lọc được theo ngày; tiệm khác không thấy.
 */
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
const SLOTS = ["18:00 - 20:00", "08:00 - 10:00", "14:00 - 16:00"]

describe("greeting-card: bảng việc Điều phối", () => {
  let a: Tenant
  let b: Tenant
  const coord = (t: Tenant) => ({ ...t.ctx, capabilities: new Set(["R1", "R3", "R4", "R5"]) })

  async function orders(t: Tenant, n: number) {
    const product = await new ProductRepository().create(t.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "le", name: "20/10", productIds: [product.id], createdBy: t.userId })
    const ids: string[] = []
    for (let i = 0; i < n; i++) {
      const link = await createSendLink({ ...t.ctx, capabilities: new Set(["R2"]) }, { catalogId: catalog.id })
      await selectBrochureProduct(link.sendCode, product.id)
      const o = await submitBrochureOrder(link.sendCode, {
        customerName: `K${i}`, customerPhone: `09${String(10_000_000 + i).slice(-8)}`, recipientName: "N", recipientPhone: "0912345678",
        confirmedTerms: true, selectedPromotionId: "promo-discount-10", deliveryDate: day(i % 2 === 0 ? 5 : 4), deliveryTimeSlot: SLOTS[i % 3]!, deliveryAddress: "1 Lê Lợi",
      })
      ids.push(o.orderId)
    }
    return ids
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đủ 25 đơn (không cắt 20), xếp theo ngày + giờ giao; đơn huỷ/giao xong cũ bị bỏ; lọc ngày; tiệm khác không thấy", async () => {
    const ids = await orders(a, 27)
    await orders(b, 2)
    await prisma.orders.update({ where: { id: ids[0]! }, data: { status: "CANCELLED" } })
    await prisma.orders.update({ where: { id: ids[1]! }, data: { delivery_status: "DELIVERED", updated_at: new Date(Date.now() - 2 * 86_400_000) } })

    const board = await getCoordinatorBoard(coord(a), {})
    expect(board.data).toHaveLength(25)
    expect(board.data.every((o) => o.organization_id === a.organizationId)).toBe(true)
    const keys = board.data.map((o) => {
      const w = o.delivery_window as { date: string; timeSlot: string }
      return `${w.date}|${w.timeSlot.slice(0, 5)}`
    })
    expect(keys).toEqual([...keys].sort())

    const day4 = await getCoordinatorBoard(coord(a), { date: day(4) })
    expect(day4.data.length).toBeGreaterThan(0)
    expect(day4.data.every((o) => (o.delivery_window as { date: string }).date === day(4))).toBe(true)
  })

  it("trạng thái việc cho bảng Điều phối: chỉ đơn (bỏ link chưa có đơn), có thời gian chuẩn; tiệm khác không thấy", async () => {
    const ids = await orders(a, 2)
    const catalog = await prisma.greeting_catalogs.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    await createSendLink({ ...a.ctx, capabilities: new Set(["R2"]) }, { catalogId: catalog.id }) // link khách chưa đặt

    const work = await getCoordinatorWork(coord(a))
    expect(work.map((w) => w.orderId).sort()).toEqual([...ids].sort())
    expect(work.every((w) => typeof w.sla.state === "string")).toBe(true)
    expect(await getCoordinatorWork(coord(b))).toEqual([])
  })
})
