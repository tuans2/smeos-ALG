import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createOrder } from "@/app/api/v1/coordinator/orders/route"
import { PATCH as patchStage } from "@/app/api/v1/coordinator/orders/[id]/stage/route"
import { PATCH as patchCustomFields } from "@/app/api/v1/coordinator/orders/[id]/custom-fields/route"
import { POST as cancelOrder } from "@/app/api/v1/coordinator/orders/[id]/cancel/route"
import { POST as openException } from "@/app/api/v1/coordinator/orders/[id]/exceptions/route"
import { POST as recordPayment } from "@/app/api/v1/coordinator/orders/[id]/payments/route"
import { prisma } from "@/core/tenancy/infra/prisma"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * UJ-02 (audit hành trình 06/11/2026, O5): đơn Thẻ chào có phiên điều phối (luồng gia công tạo) từng đi vòng
 * qua các thao tác chung của Điều phối — chuyển bước, huỷ, mở sự cố, ghi tiền — bỏ qua luật thu tiền, trả mã
 * giảm giá và báo khách của Thẻ chào. Nay các thao tác GHI đó trả 409; đơn thường không đổi hành vi.
 */
type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>

const ORDER_BODY = {
  customerName: "Nguyễn Văn An",
  customerPhone: "0987654321",
  customerTier: "VIP",
  recipientName: "Trần Thị Bình",
  recipientPhone: "0901234567",
  deliveryAddress: { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội" },
  deliveryTargetTime: "17:00 hôm nay",
  deliveryTargetAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
  productTitle: "Bó hoa hồng Pastel",
  unitPriceVnd: 850000,
  flowers: [{ flowerName: "Hồng Ohara", quantity: 12, unit: "cành", color: "hồng", role: "Chủ đạo" }],
  cardMessage: "Chúc mừng sinh nhật!",
}

describe("Điều phối tôn trọng khoá đơn Thẻ chào", () => {
  let shop: Tenant

  const call = (handler: Handler, id: string, body: unknown, method = "POST") =>
    handler(withSession(`http://localhost/api/v1/coordinator/orders/${id}`, shop.token, { method, body: JSON.stringify(body) }), {
      params: Promise.resolve({ id }),
    })

  async function newOrder(source: "BROCHURE" | null): Promise<string> {
    const res = await createOrder(
      withSession("http://localhost/api/v1/coordinator/orders", shop.token, { method: "POST", body: JSON.stringify(ORDER_BODY) })
    )
    expect(res.status).toBe(201)
    const id = ((await readJson(res)).order as { id: string }).id
    if (source) await prisma.orders.update({ where: { id }, data: { source } })
    return id
  }

  const snapshot = async (id: string) => {
    const o = await prisma.orders.findUniqueOrThrow({ where: { id }, include: { coordination: true, payments: true, exceptions: true } })
    return { status: o.status, stage: o.coordination?.stage, paid: String(o.paid_vnd), payments: o.payments.length, exceptions: o.exceptions.length }
  }

  beforeEach(async () => {
    await resetDatabase()
    shop = await createTenant("tiem-the-chao")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it.each<[string, Handler, unknown, string]>([
    ["chuyển bước", patchStage as Handler, { stage: "PLANNING" }, "PATCH"],
    ["huỷ đơn", cancelOrder as Handler, { reason: "Khách đổi ý" }, "POST"],
    ["mở sự cố", openException as Handler, { type: "MISSING_INFORMATION", description: "Thiếu địa chỉ" }, "POST"],
    ["ghi tiền", recordPayment as Handler, { kind: "DEPOSIT", amountVnd: 100000 }, "POST"],
  ])("%s trên đơn Thẻ chào → 409, dữ liệu không đổi", async (_name, handler, body, method) => {
    const id = await newOrder("BROCHURE")
    const before = await snapshot(id)
    const res = await call(handler, id, body, method)
    expect(res.status).toBe(409)
    const err = (await readJson(res)).error as { message: string }
    expect(err.message).toContain("Thẻ chào")
    expect(await snapshot(id)).toEqual(before)
  })

  it("đơn thường vẫn chuyển bước được (đối chứng)", async () => {
    const id = await newOrder(null)
    const res = await call(patchStage as Handler, id, { stage: "PLANNING" }, "PATCH")
    expect(res.status).toBe(200)
  })

  it("trường tuỳ chỉnh (không đụng luật Thẻ chào) vẫn sửa được trên đơn Thẻ chào", async () => {
    const id = await newOrder("BROCHURE")
    const res = await call(patchCustomFields as Handler, id, { customFields: {} }, "PATCH")
    expect(res.status).not.toBe(409)
  })
})
