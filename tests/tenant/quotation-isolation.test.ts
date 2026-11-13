import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { createQuotationUseCase } from "@/modules/sales/use-cases/create-quotation.use-case"
import { listQuotationsUseCase } from "@/modules/sales/use-cases/list-quotations.use-case"
import { getQuotationUseCase } from "@/modules/sales/use-cases/get-quotation.use-case"
import { updateQuotationUseCase } from "@/modules/sales/use-cases/update-quotation.use-case"
import { convertQuotationToOrderUseCase } from "@/modules/sales/use-cases/convert-quotation-to-order.use-case"

describe("Marketing & Sales Center — Cách ly tenant cho Báo giá (Quotations)", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const caps = (t: Tenant) => ({
      ...t,
      ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "R15", "Q1"]) },
    })
    a = caps(a)
    b = caps(b)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("báo giá tạo bởi tổ chức A chỉ thấy bởi A, B không thấy", async () => {
    const quoteA = await createQuotationUseCase(a.ctx, {
      items: [{ name: "Sản phẩm A của Alpha", qty: 2, unitPrice: 150000 }],
      discountAmount: 20000,
    })

    expect(quoteA.id).toBeDefined()
    expect(quoteA.organizationId).toBe(a.organizationId)
    expect(quoteA.code).toMatch(/^BG-\d{4}$/)
    expect(quoteA.subtotal).toBe(300000)
    expect(quoteA.totalAmount).toBe(280000)

    const listA = await listQuotationsUseCase(a.ctx)
    expect(listA.items).toHaveLength(1)
    expect(listA.items[0]?.code).toBe(quoteA.code)

    const listB = await listQuotationsUseCase(b.ctx)
    expect(listB.items).toHaveLength(0)
  })

  it("tổ chức B không thể xem, cập nhật hoặc chuyển đổi báo giá của A", async () => {
    const quoteA = await createQuotationUseCase(a.ctx, {
      items: [{ name: "Sản phẩm bảo mật của A", qty: 1, unitPrice: 500000 }],
    })

    // B cố gắng lấy chi tiết → NOT_FOUND
    await expect(getQuotationUseCase(b.ctx, quoteA.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    // B cố gắng cập nhật → NOT_FOUND
    await expect(
      updateQuotationUseCase(b.ctx, quoteA.id, { notes: "Hacked" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    // B cố gắng chuyển đổi thành đơn hàng → NOT_FOUND
    await expect(
      convertQuotationToOrderUseCase(b.ctx, quoteA.id),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    // Dữ liệu của A vẫn nguyên vẹn
    const safeA = await getQuotationUseCase(a.ctx, quoteA.id)
    expect(safeA.items[0]?.name).toBe("Sản phẩm bảo mật của A")
  })
})

