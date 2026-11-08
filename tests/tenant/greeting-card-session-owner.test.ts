import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { ownerCookie } from "../helpers/brochure-owner"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { brochureViewer } from "@/modules/greeting-card/use-cases/brochure-owner"
import { POST as claimPOST } from "@/app/api/v1/public/brochure/[sendCode]/claim/route"
import { POST as selectPOST } from "@/app/api/v1/public/brochure/[sendCode]/select/route"
import { POST as eventPOST } from "@/app/api/v1/public/brochure/[sendCode]/event/route"

/**
 * Link riêng `/b/<mã>` bị khách chuyển tiếp: trình duyệt đầu tiên nhận phiên, người sau không
 * thấy/sửa được phiên đó (404, không phải 403). Gửi đơn đồng thời từ hai tab chỉ ra một đơn.
 */

const ORDER_INPUT = {
  customerName: "Khách Hàng",
  customerPhone: "0987654321",
  recipientName: "Người Nhận",
  recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
  deliveryAddress: "123 Đường Hoa, Quận 1, TP.HCM",
}

const post = (url: string, headers: Record<string, string> = {}, body?: unknown) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) })

describe("greeting-card session owner", () => {
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

  async function linkWithProduct(t: Tenant, code: string) {
    const product = await new ProductRepository().create(t.ctx, { code: `HOA-${code}`, name: `Bó hoa ${code}`, attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code, name: `Bộ ${code}`, productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    return { product, link }
  }

  it("trình duyệt đầu tiên nhận phiên; trình duyệt sau bị từ chối 404", async () => {
    const { link } = await linkWithProduct(a, "chu")
    const params = { params: Promise.resolve({ sendCode: link.sendCode }) }
    const first = await claimPOST(post("http://x/api/v1/public/brochure/code/claim"), params)
    expect(first.status).toBe(200)
    expect(first.headers.get("set-cookie")).toContain(`fl_b_${link.sendCode}=`)
    const second = await claimPOST(post("http://x/api/v1/public/brochure/code/claim"), { params: Promise.resolve({ sendCode: link.sendCode }) })
    expect(second.status).toBe(404)
    // Chủ phiên xin lại (tải lại trang) vẫn được
    const again = await claimPOST(post("http://x/api/v1/public/brochure/code/claim", ownerCookie(link.sendCode)), { params: Promise.resolve({ sendCode: link.sendCode }) })
    expect(again.status).toBe(200)
    expect(await brochureViewer(link.sendCode, { ownerToken: null, staffOrganizationId: null })).toEqual({ viewer: "OTHER", shareCode: null })
  })

  it("người không có cookie chủ phiên không chọn mẫu, không ghi sự kiện được", async () => {
    const { product, link } = await linkWithProduct(a, "ngoai")
    const params = () => ({ params: Promise.resolve({ sendCode: link.sendCode }) })
    expect((await selectPOST(post("http://x/api/v1/public/brochure/code/select", {}, { productId: product.id }), params())).status).toBe(404)
    expect((await eventPOST(post("http://x/api/v1/public/brochure/code/event", {}, { event: "product_liked", productId: product.id }), params())).status).toBe(404)
    expect((await eventPOST(post("http://x/api/v1/public/brochure/code/event", ownerCookie(link.sendCode), { event: "product_liked", productId: product.id }), params())).status).toBe(200)
    const rows = await prisma.greeting_journey_events.findMany({ where: { organization_id: a.organizationId, event_type: "PRODUCT_LIKED" } })
    expect(rows).toHaveLength(1)
  })

  it("nhân viên của chính tiệm chỉ xem trước; nhân viên tiệm khác là người ngoài", async () => {
    const { link } = await linkWithProduct(a, "nv")
    expect((await brochureViewer(link.sendCode, { ownerToken: null, staffOrganizationId: a.organizationId }))?.viewer).toBe("STAFF")
    expect((await brochureViewer(link.sendCode, { ownerToken: null, staffOrganizationId: b.organizationId }))?.viewer).toBe("UNCLAIMED")
  })

  it("gửi đơn đồng thời từ hai tab chỉ tạo một đơn và cả hai nhận cùng mã đơn", async () => {
    const { product, link } = await linkWithProduct(a, "dongthoi")
    await selectBrochureProduct(link.sendCode, product.id)
    const [x, y] = await Promise.all([submitBrochureOrder(link.sendCode, ORDER_INPUT), submitBrochureOrder(link.sendCode, ORDER_INPUT)])
    expect(x.orderId).toBe(y.orderId)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(1)
  })
})
