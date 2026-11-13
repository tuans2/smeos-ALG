import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { proposeSubstitute, respondSubstitute, substituteOptions } from "@/modules/greeting-card/use-cases/substitute"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"
import { getGreetingCatalogForCustomer } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import { flowerSubstituteOptions, proposeFlowerSubstitute, respondFlowerSubstitute } from "@/modules/greeting-card/use-cases/flower-substitute"

/** Đề xuất mẫu thay thế (08/10/2026): mẫu cùng bộ sưu tập, khách chọn, giữ giá, cách ly tổ chức. */

const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1",
}
const PROOF = { phoneLast4: "4321" }
const req = () => new Request("http://localhost/api")

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: đề xuất mẫu thay thế", () => {
  let a: Tenant
  let b: Tenant
  let staffA: TenantContext
  let staffB: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    staffA = { ...a.ctx, capabilities: new Set(["R1", "R2", "R3", "R9"]) }
    staffB = { ...b.ctx, capabilities: new Set(["R1", "R2", "R3", "R9"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function placeOrder() {
    const products = new ProductRepository()
    const x = await products.create(a.ctx, { code: "HOA-X", name: "Bó X", attributes: { price: 500000 } })
    const y = await products.create(a.ctx, { code: "HOA-Y", name: "Bó Y", attributes: { price: 450000 } })
    const z = await products.create(a.ctx, { code: "HOA-Z", name: "Bó Z", attributes: { price: 600000 } })
    const outside = await products.create(a.ctx, { code: "HOA-NGOAI", name: "Bó ngoài", attributes: { price: 1 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-x", name: "Bộ X", productIds: [x.id, y.id, z.id], createdBy: a.userId })
    const link = await createSendLink(staffA, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, x.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    return { order, x, y, z, outside }
  }

  it("chỉ mẫu cùng bộ sưu tập, khác mẫu đang đặt; tổ chức khác 404; một đề xuất chờ mỗi đơn", async () => {
    const { order, x, y, z, outside } = await placeOrder()
    const opts = await substituteOptions(staffA, order.orderId)
    expect(opts.current).toMatchObject({ productId: x.id, name: "Bó X" })
    expect(opts.options.map((o) => o.productId).sort()).toEqual([y.id, z.id].sort())
    expect(await codeOf(substituteOptions(staffB, order.orderId))).toBe("NOT_FOUND")
    expect(await codeOf(proposeSubstitute(staffB, order.orderId, { reason: "Hết hoa hồng", productIds: [y.id] }))).toBe("NOT_FOUND")
    expect(await codeOf(proposeSubstitute(staffA, order.orderId, { reason: "Hết hoa hồng", productIds: [outside.id] }))).toBe("VALIDATION_FAILED")

    await proposeSubstitute(staffA, order.orderId, { reason: "Hết hoa hồng", productIds: [y.id, z.id] })
    expect(await codeOf(proposeSubstitute(staffA, order.orderId, { reason: "Hết hoa hồng", productIds: [y.id] }))).toBe("CONFLICT")
  })

  it("khách chọn mẫu → đổi mẫu trên đơn, giữ tổng tiền, ghi chú cho thợ cắm, lưu câu trả lời", async () => {
    const { order, x, y, z } = await placeOrder()
    const proposal = await proposeSubstitute(staffA, order.orderId, { reason: "Hoa hồng hôm nay bị dập", productIds: [y.id, z.id] })

    const tracking = await getBrochureTracking(order.orderCode, PROOF)
    expect(tracking.status === "FOUND" && tracking.order.substitute?.pending).toMatchObject({ id: proposal.id, originalName: "Bó X" })
    expect(JSON.stringify(tracking)).not.toContain("HOA-Y")
    const anon = await getBrochureTracking(order.orderCode)
    expect(anon.status === "FOUND" && anon.order.substitute).toBeNull()

    const input = { proposalId: proposal.id, choice: "OPTION" as const, productId: z.id }
    expect(await codeOf(respondSubstitute(req(), order.orderCode, { phoneLast4: "0000" }, input))).toBe("NOT_FOUND")
    expect(await codeOf(respondSubstitute(req(), order.orderCode, PROOF, { ...input, productId: x.id }))).toBe("VALIDATION_FAILED")
    const answered = await respondSubstitute(req(), order.orderCode, PROOF, input)
    expect(answered).toMatchObject({ status: "ANSWERED", choice: "OPTION", chosenName: "Bó Z" })
    expect(await codeOf(respondSubstitute(req(), order.orderCode, PROOF, input))).toBe("NOT_FOUND")

    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId }, include: { items: true } })
    expect(Number(row.total_vnd)).toBe(500000)
    expect(row.items[0]?.product_id).toBe(z.id)
    expect(row.items[0]?.metadata).toMatchObject({ name: "Bó Z", price: 500000, substitutedFrom: { id: x.id } })
    expect(row.internal_note).toContain('[Đổi mẫu] Khách đồng ý đổi "Bó X" sang "Bó Z"')
    const msg = await prisma.greeting_messages.findFirst({ where: { order_id: order.orderId, kind: "SUBSTITUTE_RESPONSE" } })
    expect(msg?.to_role).toBe("COORDINATOR")
  })

  it("hoa đã giao shipper → không đề xuất, không trả lời được; nhờ tiệm chọn không đổi mẫu", async () => {
    const { order, x, y } = await placeOrder()
    const proposal = await proposeSubstitute(staffA, order.orderId, { reason: "Hết hoa hồng", productIds: [y.id] })
    await prisma.orders.update({ where: { id: order.orderId }, data: { delivery_status: "DISPATCHED" } })
    expect(await codeOf(respondSubstitute(req(), order.orderCode, PROOF, { proposalId: proposal.id, choice: "SHOP_DECIDES" }))).toBe("CONFLICT")
    await prisma.orders.update({ where: { id: order.orderId }, data: { delivery_status: "PENDING" } })

    await respondSubstitute(req(), order.orderCode, PROOF, { proposalId: proposal.id, choice: "SHOP_DECIDES", note: "Tông hồng nhạt" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId }, include: { items: true } })
    expect(row.items[0]?.product_id).toBe(x.id)
    expect(row.internal_note).toContain("Tông hồng nhạt")

    await prisma.orders.update({ where: { id: order.orderId }, data: { delivery_status: "DELIVERING" } })
    expect(await codeOf(proposeSubstitute(staffA, order.orderId, { reason: "Hết hoa hồng", productIds: [y.id] }))).toBe("CONFLICT")
  })

  const FLOWERS = [
    { flowerName: "Hồng Ecuador", quantity: 10, unit: "cành", color: "Đỏ", role: "Chủ đạo" },
    { flowerName: "Baby trắng", quantity: 3, unit: "cành", color: "Trắng", role: "Lấp đầy" },
  ]
  async function photoOf(t: Tenant) {
    return prisma.assets.create({ data: {
      id: randomUUID(), organization_id: t.organizationId, kind: "ORIGINAL", state: "READY", version: 1,
      storage_key: `org/${t.organizationId}/unfiled/${randomUUID()}.jpg`, mime_type: "image/jpeg", created_by: t.userId,
    } })
  }

  it("công thức khai ở form sản phẩm theo đơn Thẻ Chào sang phiếu thợ và đề xuất thay hoa (5.14), không cần chèn tay", async () => {
    const bom = { flowers: [
      { name: "Hồng Ecuador", quantity: 10, unit: "cành", color: "Đỏ", role: "Hoa chính" },
      { name: "Cúc Fiji", quantity: 5, unit: "cành", color: "Trắng", role: "Hoa phụ" },
    ] }
    const x = await new ProductRepository().create(a.ctx, { code: "HOA-BOM", name: "Bó có công thức", attributes: { price: 500000, bom } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-bom", name: "Bộ", productIds: [x.id], createdBy: a.userId })
    const link = await createSendLink(staffA, { catalogId: catalog.id })
    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(view.status === "ACTIVE" && "recipe" in (view.products[0] ?? {})).toBe(false)
    await selectBrochureProduct(link.sendCode, x.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    const item = await prisma.order_items.findFirstOrThrow({ where: { order_id: order.orderId } })
    expect((item.metadata as { flowers?: unknown }).flowers).toEqual([
      { flowerName: "Hồng Ecuador", quantity: 10, unit: "cành", color: "Đỏ", role: "Chủ đạo" },
      { flowerName: "Cúc Fiji", quantity: 5, unit: "cành", color: "Trắng", role: "Hoa phụ" },
    ])
    const opts = await flowerSubstituteOptions(staffA, order.orderId)
    expect(opts.lines.map((l) => l.flowerName)).toEqual(["Cúc Fiji"])
  })

  it("đổi một loại hoa phụ (ALG 5.14): có ảnh tiệm chụp, khách đồng ý → công thức của đơn đổi đúng dòng", async () => {
    const { order, y } = await placeOrder()
    const item = await prisma.order_items.findFirstOrThrow({ where: { order_id: order.orderId } })
    await prisma.order_items.update({ where: { id: item.id }, data: { metadata: { ...(item.metadata as object), flowers: FLOWERS } } })
    const opts = await flowerSubstituteOptions(staffA, order.orderId)
    expect(opts.lines.map((l) => l.flowerName)).toEqual(["Baby trắng"])
    expect(await codeOf(flowerSubstituteOptions(staffB, order.orderId))).toBe("NOT_FOUND")

    const photo = await photoOf(a)
    const foreign = await photoOf(b)
    const input = { reason: "Baby trắng hôm nay hết", lineIndex: 1, replacementName: "Cẩm chướng", replacementColor: "Hồng nhạt", photoAssetId: photo.id }
    expect(await codeOf(proposeFlowerSubstitute(staffA, order.orderId, { ...input, photoAssetId: foreign.id }))).toBe("VALIDATION_FAILED")
    expect(await codeOf(proposeFlowerSubstitute(staffA, order.orderId, { ...input, lineIndex: 0 }))).toBe("VALIDATION_FAILED")
    expect(await codeOf(proposeFlowerSubstitute(staffB, order.orderId, input))).toBe("NOT_FOUND")
    const proposal = await proposeFlowerSubstitute(staffA, order.orderId, input)
    expect(await codeOf(proposeSubstitute(staffA, order.orderId, { reason: "Hết hoa hồng", productIds: [y.id] }))).toBe("CONFLICT")

    const tracking = await getBrochureTracking(order.orderCode, PROOF)
    const pending = tracking.status === "FOUND" ? tracking.order.flowerSubstitute?.pending : null
    expect(pending).toMatchObject({ id: proposal.id, originalFlower: "Baby trắng", replacementFlower: "Cẩm chướng" })
    expect(pending?.photoUrl).toBeTruthy()
    expect(JSON.stringify(pending)).not.toContain(photo.id)
    const anon = await getBrochureTracking(order.orderCode)
    expect(anon.status === "FOUND" && anon.order.flowerSubstitute).toBeNull()

    expect(await codeOf(respondFlowerSubstitute(req(), order.orderCode, { phoneLast4: "0000" }, { proposalId: proposal.id, choice: "ACCEPT" }))).toBe("NOT_FOUND")
    const answered = await respondFlowerSubstitute(req(), order.orderCode, PROOF, { proposalId: proposal.id, choice: "ACCEPT" })
    expect(answered).toMatchObject({ status: "ANSWERED", choice: "ACCEPT" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId }, include: { items: true } })
    const flowers = (row.items[0]?.metadata as { flowers: Array<Record<string, unknown>> }).flowers
    expect(flowers[0]).toMatchObject({ flowerName: "Hồng Ecuador", color: "Đỏ" })
    expect(flowers[1]).toMatchObject({ flowerName: "Cẩm chướng", color: "Hồng nhạt", quantity: 3, role: "Lấp đầy", substitutedFrom: { flowerName: "Baby trắng" } })
    expect(Number(row.total_vnd)).toBe(500000)
    expect(row.internal_note).toContain('[Đổi hoa] Khách đồng ý thay "Baby trắng" bằng "Cẩm chướng"')
    expect(await codeOf(respondFlowerSubstitute(req(), order.orderCode, PROOF, { proposalId: proposal.id, choice: "DECLINE" }))).toBe("NOT_FOUND")
  })

  it("khách không đồng ý đổi hoa → công thức giữ nguyên, tiệm được nhắc liên hệ", async () => {
    const { order } = await placeOrder()
    const item = await prisma.order_items.findFirstOrThrow({ where: { order_id: order.orderId } })
    await prisma.order_items.update({ where: { id: item.id }, data: { metadata: { ...(item.metadata as object), flowers: FLOWERS } } })
    const photo = await photoOf(a)
    const proposal = await proposeFlowerSubstitute(staffA, order.orderId, { reason: "Baby trắng hôm nay hết", lineIndex: 1, replacementName: "Cẩm chướng", photoAssetId: photo.id })
    await respondFlowerSubstitute(req(), order.orderCode, PROOF, { proposalId: proposal.id, choice: "DECLINE", note: "Giữ baby giúp mình" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId }, include: { items: true } })
    expect((row.items[0]?.metadata as { flowers: Array<{ flowerName: string }> }).flowers[1]?.flowerName).toBe("Baby trắng")
    expect(row.internal_note).toContain("cửa hàng liên hệ khách trước khi cắm")
  })
})
