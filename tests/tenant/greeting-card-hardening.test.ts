import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { getGreetingCatalogForCustomer } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"
import {
  adminConfirmBrochurePayment,
  reportCustomerPayment,
} from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import {
  dispatchBrochureShipping,
  uploadBrochureProductPhoto,
} from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { revokeSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { getSalesFunnel } from "@/modules/greeting-card/use-cases/get-sales-funnel"
import { POST as selectPOST } from "@/app/api/v1/public/brochure/[sendCode]/select/route"
import { POST as orderPOST } from "@/app/api/v1/public/brochure/[sendCode]/order/route"
import { ownerCookie } from "../helpers/brochure-owner"

/**
 * Ca thử hồi quy cho đợt debug Thẻ Chào 05/10/2026 — mỗi ca khoá một lỗi
 * đã tái hiện được trên mã cũ (giá do khách tự đặt, mã gửi trùng giữa hai
 * tiệm, đặt/xác nhận trùng, gắn sản phẩm/ảnh của tiệm khác...).
 */

const ORDER_INPUT = {
  customerName: "Khách Hàng",
  customerPhone: "0987654321",
  recipientName: "Người Nhận",
  recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: inTenDays(),
  deliveryAddress: "123 Đường Hoa, Quận 1, TP.HCM",
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

function inTenDays(): string {
  return new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
}

describe("greeting-card hardening", () => {
  let a: Tenant
  let b: Tenant
  let repo: GreetingCardRepository

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    repo = new GreetingCardRepository()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function catalogWith(t: Tenant, code: string, price: number | null) {
    const product = await new ProductRepository().create(t.ctx, {
      code: `HOA-${code}`,
      name: `Bó hoa ${code}`,
      ...(price !== null ? { attributes: { price } } : {}),
    })
    const catalog = await repo.createCatalog(t.ctx, {
      code,
      name: `Bộ ${code}`,
      productIds: [product.id],
      createdBy: t.userId,
    })
    return { product, catalog }
  }

  it("bỏ qua giá khách gửi lên khi chọn mẫu — giá lấy từ Product Master", async () => {
    const { product, catalog } = await catalogWith(a, "gia-that", 850000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })

    const res = await selectPOST(
      new Request("http://x/api/v1/public/brochure/code/select", {
        method: "POST",
        headers: { "content-type": "application/json", ...ownerCookie(link.sendCode) },
        body: JSON.stringify({ productId: product.id, product: { id: product.id, price: 1000 } }),
      }),
      { params: Promise.resolve({ sendCode: link.sendCode }) }
    )
    expect(res.status).toBe(200)

    const order = await submitBrochureOrder(link.sendCode, ORDER_INPUT)
    expect(order.totalVnd).toBe(850000)
  })

  it("không cho chọn mẫu không thuộc bộ sưu tập của link", async () => {
    const { catalog } = await catalogWith(a, "bo-a", 500000)
    const { product: other } = await catalogWith(b, "bo-b", 1000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    expect(await codeOf(selectBrochureProduct(link.sendCode, other.id))).toBe("NOT_FOUND")
  })

  it("không đặt đơn khi khách chưa chọn mẫu; mẫu chưa có giá vẫn chọn được với giá 0 (\"Liên hệ\")", async () => {
    const { product, catalog } = await catalogWith(a, "chua-gia", null)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    expect(await codeOf(submitBrochureOrder(link.sendCode, ORDER_INPUT))).toBe("UNPROCESSABLE_ENTITY")
    expect(await selectBrochureProduct(link.sendCode, product.id)).toMatchObject({ id: product.id, price: 0 })
  })

  it("mã gửi của hai tiệm không trùng và không đoán được theo thứ tự", async () => {
    const { catalog: ca } = await catalogWith(a, "c-a", 500000)
    const { catalog: cb } = await catalogWith(b, "c-b", 600000)
    const la = await createSendLink(a.ctx, { catalogId: ca.id })
    const lb = await createSendLink(b.ctx, { catalogId: cb.id })
    expect(la.sendCode).not.toBe(lb.sendCode)
    expect(la.sendCode).not.toMatch(/-0*1$/)

    const viewA = await getGreetingCatalogForCustomer(la.sendCode)
    expect(viewA.status).toBe("ACTIVE")
    if (viewA.status === "ACTIVE") {
      expect(viewA.catalog.id).toBe(ca.id)
      expect(JSON.stringify(viewA.session)).not.toContain(a.organizationId)
    }
  })

  it("link công khai không lộ SĐT khách và id tổ chức", async () => {
    const { catalog } = await catalogWith(a, "pii", 500000)
    const link = await createSendLink(a.ctx, {
      catalogId: catalog.id,
      customerName: "Chị Lan",
      customerPhone: "0909111222",
    })
    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(JSON.stringify(view)).not.toContain("0909111222")
    expect(JSON.stringify(view)).not.toContain(a.organizationId)
  })

  it("gửi đơn hai lần trả về cùng một đơn, không tạo đơn trùng", async () => {
    const { product, catalog } = await catalogWith(a, "trung", 700000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const first = await submitBrochureOrder(link.sendCode, ORDER_INPUT)
    const second = await submitBrochureOrder(link.sendCode, ORDER_INPUT)
    expect(second.orderId).toBe(first.orderId)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(1)
  })

  it("route đặt đơn trả lỗi đúng hình dạng và từ chối ngày giao đã qua", async () => {
    const { product, catalog } = await catalogWith(a, "ngay", 700000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const res = await orderPOST(
      new Request("http://x/api/v1/public/brochure/code/order", {
        method: "POST",
        headers: { "content-type": "application/json", ...ownerCookie(link.sendCode) },
        body: JSON.stringify({ ...ORDER_INPUT, deliveryDate: "2020-01-01" }),
      }),
      { params: Promise.resolve({ sendCode: link.sendCode }) }
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("VALIDATION_FAILED")
  })

  it("xác nhận thanh toán hai lần bị chặn, chỉ ghi một phiếu thu", async () => {
    const { product, catalog } = await catalogWith(a, "thu", 900000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER_INPUT)

    await adminConfirmBrochurePayment(a.ctx, order.orderId)
    expect(await codeOf(adminConfirmBrochurePayment(a.ctx, order.orderId))).toBe("CONFLICT")
    expect(await codeOf(adminConfirmBrochurePayment(b.ctx, order.orderId))).toBe("NOT_FOUND")
    expect(await prisma.order_payments.count({ where: { order_id: order.orderId } })).toBe(1)
  })

  it("khách báo đã chuyển khoản khi chưa có đơn bị từ chối", async () => {
    const { catalog } = await catalogWith(a, "bao-ck", 500000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    expect(await codeOf(reportCustomerPayment(link.sendCode))).toBe("UNPROCESSABLE_ENTITY")
  })

  it("không gắn được sản phẩm của tiệm khác vào bộ sưu tập", async () => {
    const { product: foreign } = await catalogWith(b, "ngoai", 500000)
    expect(
      await codeOf(
        repo.createCatalog(a.ctx, { code: "lan", name: "Lấn", productIds: [foreign.id], createdBy: a.userId })
      )
    ).toBe("NOT_FOUND")
    const { catalog } = await catalogWith(a, "cua-a", 500000)
    expect(await codeOf(repo.addProductToCatalog(a.ctx, catalog.id, foreign.id))).toBe("NOT_FOUND")
  })

  it("không gắn được ảnh của tiệm khác vào đơn và giữ đúng thứ tự xưởng", async () => {
    const { product, catalog } = await catalogWith(a, "xuong", 500000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER_INPUT)

    const foreignAsset = await prisma.assets.create({
      data: {
        id: randomUUID(), organization_id: b.organizationId, kind: "ORIGINAL", state: "READY", version: 1,
        storage_key: `org/${b.organizationId}/unfiled/${randomUUID()}.jpg`, mime_type: "image/jpeg", created_by: b.userId,
      },
    })
    expect(
      await codeOf(uploadBrochureProductPhoto(a.ctx, order.orderId, { assetId: foreignAsset.id }))
    ).toBe("NOT_FOUND")

    // Chưa có ảnh thành phẩm (hoa chưa READY) thì chưa được giao ship
    expect(
      await codeOf(dispatchBrochureShipping(a.ctx, order.orderId, { trackingNote: "Ship A" }))
    ).toBe("CONFLICT")
  })

  it("tra cứu công khai chỉ thấy đơn Thẻ chào, không thấy đơn thường", async () => {
    await prisma.orders.create({
      data: {
        organization_id: a.organizationId,
        code: "DH-THUONG-01",
        source: "MANUAL",
        total_vnd: 100000,
        paid_vnd: 0,
        balance_vnd: 100000,
        created_by: a.userId,
      },
    })
    const res = await getBrochureTracking("DH-THUONG-01")
    expect(res.status).toBe("NOT_FOUND")
  })

  it("thông tin chuyển khoản lấy theo cấu hình của từng tiệm", async () => {
    const { product, catalog } = await catalogWith(a, "qr", 650000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)

    const withoutConfig = await submitBrochureOrder(link.sendCode, ORDER_INPUT)
    expect(withoutConfig.vietQr).toBeNull()

    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: {
        settings: {
          brochure_payment: {
            bank_id: "VCB",
            bank_name: "Vietcombank",
            account_no: "0011223344",
            account_name: "TIEM HOA ALPHA",
          },
        },
      },
    })
    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(view.status).toBe("ACTIVE")
    if (view.status === "ACTIVE") {
      expect(view.payment?.accountNo).toBe("0011223344")
      expect(view.payment?.qrUrl).toContain("VCB-0011223344")
      expect(view.payment?.amount).toBe(650000)
    }
  })

  it("link hết hạn hoặc đã thu hồi (greeting_sessions) trả 404 khi chưa có đơn", async () => {
    const { catalog } = await catalogWith(a, "han", 500000)
    const expired = await createSendLink(a.ctx, { catalogId: catalog.id })
    await prisma.greeting_sessions.update({
      where: { id: expired.sessionId },
      data: { expires_at: new Date(Date.now() - 1000) },
    })
    // Link chết vẫn không dùng được, nhưng khách thấy trang liên hệ đúng cửa hàng thay vì 404 trơn
    expect((await getGreetingCatalogForCustomer(expired.sendCode)).status).toBe("UNAVAILABLE")

    const revoked = await createSendLink(a.ctx, { catalogId: catalog.id })
    expect(await codeOf(revokeSendLink(b.ctx, revoked.sessionId))).toBe("NOT_FOUND")
    await revokeSendLink(a.ctx, revoked.sessionId)
    await revokeSendLink(a.ctx, revoked.sessionId) // idempotent
    // Link chết vẫn không dùng được, nhưng khách thấy trang liên hệ đúng cửa hàng thay vì 404 trơn
    expect((await getGreetingCatalogForCustomer(revoked.sendCode)).status).toBe("UNAVAILABLE")
  })

  it("không thu hồi được link đã có đơn; đơn vẫn xem được dù link quá hạn", async () => {
    const { product, catalog } = await catalogWith(a, "co-don", 500000)
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    await submitBrochureOrder(link.sendCode, ORDER_INPUT)
    expect(await codeOf(revokeSendLink(a.ctx, link.sessionId))).toBe("CONFLICT")
    await prisma.greeting_sessions.update({ where: { id: link.sessionId }, data: { expires_at: new Date(0) } })
    expect((await getGreetingCatalogForCustomer(link.sendCode)).status).toBe("ACTIVE")
  })

  it("phễu theo sale chỉ đếm dữ liệu của chính tổ chức", async () => {
    const { product, catalog } = await catalogWith(a, "pheu", 400000)
    const l1 = await createSendLink(a.ctx, { catalogId: catalog.id })
    await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(l1.sendCode, product.id)
    const order = await submitBrochureOrder(l1.sendCode, ORDER_INPUT)
    await adminConfirmBrochurePayment(a.ctx, order.orderId)
    const { catalog: cb } = await catalogWith(b, "pheu-b", 400000)
    await createSendLink(b.ctx, { catalogId: cb.id })

    const funnel = await getSalesFunnel(a.ctx, 30)
    expect(funnel.total).toMatchObject({ sent: 2, opened: 0, selected: 1, ordered: 1, paid: 1, revenueVnd: 400000 })
    expect(funnel.rows[0]?.saleName).toBe("Người dùng alpha")
    expect((await getSalesFunnel(b.ctx, 30)).total.sent).toBe(1)
  })
})
