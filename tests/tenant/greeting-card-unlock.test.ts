import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { resetRateLimits } from "@/core/http/rate-limit"
import { POST as unlockPost } from "@/app/api/v1/public/brochure/[sendCode]/unlock/route"
import { GET as brochureGet } from "@/app/api/v1/public/brochure/[sendCode]/route"

/**
 * PO 08/10/2026 (Đợt 2-F): khách mở lại link riêng đã có đơn ở trình duyệt khác (Zalo → Safari, link
 * trong tin nhắn) bằng 4 số cuối SĐT người đặt. Sai số / phiên chưa có đơn → 404; thử quá nhiều → 429.
 */
const ORDER = {
  customerName: "Khách", customerPhone: "0987 65 5678", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10", deliveryDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
}
const params = (sendCode: string) => ({ params: Promise.resolve({ sendCode }) })
const unlock = (code: string, phoneLast4: string) =>
  unlockPost(new Request(`http://localhost/api/v1/public/brochure/${code}/unlock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phoneLast4 }) }), params(code))

describe("greeting-card: mở lại link đã có đơn bằng 4 số cuối SĐT", () => {
  let a: Tenant
  let product: string
  let catalog: string

  beforeEach(async () => {
    await resetDatabase()
    resetRateLimits()
    a = await createTenant("alpha")
    product = (await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })).id
    catalog = (await new GreetingCardRepository().createCatalog(a.ctx, { code: "le", name: "20/10", productIds: [product], createdBy: a.userId })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function link() {
    const l = await createSendLink({ ...a.ctx, capabilities: new Set(["R2"]) }, { catalogId: catalog })
    await selectBrochureProduct(l.sendCode, product)
    return l.sendCode
  }

  it("sai số → 404; đúng số → cookie chủ phiên, trình duyệt mới xem được đơn", async () => {
    const code = await link()
    await submitBrochureOrder(code, ORDER)
    expect((await unlock(code, "1234")).status).toBe(404)
    const ok = await unlock(code, "5678")
    expect(ok.status).toBe(200)
    const cookie = ok.headers.get("set-cookie")!.split(";")[0]!
    const view = await brochureGet(new Request(`http://localhost/api/v1/public/brochure/${code}`, { headers: { cookie } }), params(code))
    expect(view.status).toBe(200)
    expect(((await view.json()) as { order?: { totalVnd: number } }).order?.totalVnd).toBeGreaterThan(0)
  })

  it("phiên chưa có đơn không mở được bằng số điện thoại (404)", async () => {
    const code = await link()
    expect((await unlock(code, "5678")).status).toBe(404)
  })

  it("thử sai quá 5 lần → 429, kể cả lần sau nhập đúng", async () => {
    const code = await link()
    await submitBrochureOrder(code, ORDER)
    for (let i = 0; i < 5; i++) expect((await unlock(code, String(1000 + i))).status).toBe(404)
    expect((await unlock(code, "5678")).status).toBe(429)
  })
})
