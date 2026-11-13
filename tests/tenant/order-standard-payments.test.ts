import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"
import { POST as postPayment } from "@/app/api/v1/orders/[id]/payments/route"
import { GET as getWorkbench } from "@/app/api/v1/orders/workbench/route"
import { createCoordinatorOrder } from "@/modules/coordinator/use-cases/create-coordinator-order"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import { matchStandardBankTransfers } from "@/modules/orders/use-cases/match-standard-bank-transfers"

/** P3b — thu tiền đơn ngoài Thẻ chào và tự khớp SePay: chỉ trong đúng tổ chức. */
const BASE = "http://localhost/api/v1"

describe("cách ly tenant — thu tiền đơn ngoài Thẻ chào, khớp chuyển khoản", () => {
  let a: Tenant
  let b: Tenant
  let order: { id: string; code: string }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    order = await ingestOrder(a.ctx, { source: "MANUAL", items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 1_000_000 }] })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const pay = (t: Tenant, amountVnd: number) =>
    postPayment(withSession(`${BASE}/orders/${order.id}/payments`, t.token, { method: "POST", body: JSON.stringify({ amountVnd, method: "BANK_TRANSFER" }) }), { params: Promise.resolve({ id: order.id }) })

  it("B ghi thu đơn của A → 404; A ghi cọc → CONFIRMED, sang Điều phối; vượt phần còn lại → 422", async () => {
    expect((await pay(b, 300_000)).status).toBe(404)
    expect(await prisma.order_payments.count()).toBe(0)
    expect((await pay(a, 300_000)).status).toBe(201)
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.id } })
    expect(row).toMatchObject({ status: "CONFIRMED", workflow: "STANDARD" })
    expect(Number(row.paid_vnd)).toBe(300_000)
    expect(await prisma.order_coordinations.count({ where: { order_id: order.id, organization_id: a.organizationId } })).toBe(1)
    expect((await pay(a, 800_000)).status).toBe(422)
  })

  it("chuyển khoản SePay: chỉ khớp đơn cùng tổ chức với giao dịch; chạy lại không ghi trùng", async () => {
    const mk = (org: string, ext: string) => prisma.greeting_payment_events.create({
      data: { organization_id: org, provider: "SEPAY", external_id: ext, amount_vnd: 300_000, content: `CK ${order.code}`, status: "UNMATCHED" },
    })
    const eb = await mk(b.organizationId, "tx-b")
    const ea = await mk(a.organizationId, "tx-a")
    expect((await matchStandardBankTransfers()).matched).toBe(1)
    expect((await matchStandardBankTransfers()).matched).toBe(0)
    expect(await prisma.greeting_payment_events.findUniqueOrThrow({ where: { id: ea.id } })).toMatchObject({ status: "MATCHED", order_id: order.id })
    expect(await prisma.greeting_payment_events.findUniqueOrThrow({ where: { id: eb.id } })).toMatchObject({ status: "UNMATCHED", order_id: null })
    expect(await prisma.order_payments.count()).toBe(1)
  })

  // PO 07/11/2026 (Q2, audit BL-06): đơn tạo ở Điều phối mang mã `FLR-…` — bộ khớp chỉ đọc `DH…` nên khách
  // chuyển khoản đúng mã vẫn nằm "chưa khớp". Nguồn ghi cùng mã ở `orders` và `order_coordinations`.
  it("đơn tạo ở Điều phối: nguồn theo danh mục chung, chuyển khoản ghi mã FLR (bỏ gạch) khớp được, chỉ trong tổ chức", async () => {
    const flr = await createCoordinatorOrder(a.ctx, {
      customerName: "Khách lẻ", recipientName: "Bình", recipientPhone: "0901234567", deliveryAddress: { street: "1 Phố Huế" },
      deliveryTargetTime: "17:00 hôm nay", productTitle: "Bó hồng", unitPriceVnd: 500_000, flowers: [], source: "CHAT",
    })
    expect(flr.orderCode).toMatch(/^FLR-\d{6}-\d{4}$/)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: flr.id } })).source).toBe("CHAT")
    expect((await prisma.order_coordinations.findFirstOrThrow({ where: { order_id: flr.id } })).source).toBe("CHAT")
    const content = `CK ${flr.orderCode.replace(/-/g, "")} chi Lan`
    const eb = await prisma.greeting_payment_events.create({ data: { organization_id: b.organizationId, provider: "SEPAY", external_id: "flr-b", amount_vnd: 200_000, content, status: "UNMATCHED" } })
    const ea = await prisma.greeting_payment_events.create({ data: { organization_id: a.organizationId, provider: "SEPAY", external_id: "flr-a", amount_vnd: 200_000, content, status: "UNMATCHED" } })
    expect((await matchStandardBankTransfers()).matched).toBe(1)
    expect(await prisma.greeting_payment_events.findUniqueOrThrow({ where: { id: ea.id } })).toMatchObject({ status: "MATCHED", order_id: flr.id })
    expect(await prisma.greeting_payment_events.findUniqueOrThrow({ where: { id: eb.id } })).toMatchObject({ status: "UNMATCHED", order_id: null })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: flr.id } })
    expect([Number(row.paid_vnd), Number(row.balance_vnd)]).toEqual([200_000, 300_000])
    expect(await prisma.order_coordinations.count({ where: { order_id: flr.id } })).toBe(1)
  })

  it("bàn làm việc: A thấy đơn của mình, B không thấy", async () => {
    const wa = (await readJson(await getWorkbench(withSession(`${BASE}/orders/workbench`, a.token)))) as { items: { id: string }[] }
    const wb = (await readJson(await getWorkbench(withSession(`${BASE}/orders/workbench`, b.token)))) as { items: { id: string }[] }
    expect(wa.items.map((i) => i.id)).toContain(order.id)
    expect(wb.items).toEqual([])
  })
})
