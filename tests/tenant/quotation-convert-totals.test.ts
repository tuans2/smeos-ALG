import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { createQuotationUseCase } from "@/modules/sales/use-cases/create-quotation.use-case"
import { convertQuotationToOrderUseCase } from "@/modules/sales/use-cases/convert-quotation-to-order.use-case"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * UJ-08 (audit hành trình 06/11/2026, Q1): chuyển báo giá thành đơn từng chỉ chép dòng hàng — ưu đãi và phí
 * vận chuyển bị bỏ, tổng đơn khác tổng báo giá khách đã đồng ý. Nay tổng đơn = tổng báo giá, điều chỉnh được lưu.
 */
describe("chuyển báo giá thành đơn giữ đúng tổng tiền", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    const t = await createTenant("bao-gia")
    a = { ...t, ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "R15", "Q1", "R2"]) } }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function accepted(input: { discountAmount?: number; shippingFee?: number }) {
    const q = await createQuotationUseCase(a.ctx, { items: [{ name: "Bó hoa hồng", qty: 2, unitPrice: 500_000 }], ...input })
    await prisma.quotations.update({ where: { id: q.id }, data: { status: "ACCEPTED" } })
    return q
  }

  it("ưu đãi và phí vận chuyển đi theo sang đơn: 2 × 500.000 − 100.000 + 30.000 = 930.000", async () => {
    const q = await accepted({ discountAmount: 100_000, shippingFee: 30_000 })
    expect(q.totalAmount).toBe(930_000)

    const { order } = await convertQuotationToOrderUseCase(a.ctx, q.id)

    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.id } })
    expect(Number(row.total_vnd)).toBe(930_000)
    expect(Number(row.balance_vnd)).toBe(930_000)
    expect(row.pricing_rule_ref).toMatchObject({ quotationAdjustment: { quotationCode: q.code, discountVnd: 100_000, shippingFeeVnd: 30_000 } })
    // Dòng hàng giữ nguyên — phí ship không thành dòng hàng (không lọt vào phiếu thợ)
    expect(await prisma.order_items.count({ where: { order_id: order.id } })).toBe(1)
  })

  it("báo giá không có điều chỉnh: tổng đơn = tổng dòng hàng như trước", async () => {
    const q = await accepted({})
    const { order } = await convertQuotationToOrderUseCase(a.ctx, q.id)
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: order.id } })).total_vnd)).toBe(1_000_000)
  })
})
