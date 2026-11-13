import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { GET as publicQuotationGET } from "@/app/api/v1/public/quotation/[token]/route"
import { resetRateLimits } from "@/core/http/rate-limit"
import { getQuotationRepository } from "@/modules/sales/infra/quotation-repository"
import { convertQuotationToOrderUseCase } from "@/modules/sales/use-cases/convert-quotation-to-order.use-case"
import { createQuotationUseCase } from "@/modules/sales/use-cases/create-quotation.use-case"
import { sendQuotationUseCase } from "@/modules/sales/use-cases/send-quotation.use-case"
import { updateQuotationUseCase } from "@/modules/sales/use-cases/update-quotation.use-case"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Báo giá: link công khai, ID tham chiếu chéo tổ chức, chuyển thành đơn một lần
 * (REMEDIATION_ENTERPRISE_UI P0-1 … P0-4).
 */
describe("Báo giá — link công khai và tham chiếu chéo tổ chức", () => {
  let a: Tenant
  let b: Tenant

  const withQuotationCaps = (t: Tenant): Tenant => ({
    ...t,
    ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "R15", "Q1"]) },
  })

  async function openPublic(token: string) {
    const res = await publicQuotationGET(new Request(`http://localhost/api/v1/public/quotation/${token}`), {
      params: Promise.resolve({ token }),
    } as never)
    return { status: res.status, body: (await res.json()) as Record<string, unknown> }
  }

  async function customerOf(t: Tenant, phone: string) {
    return prisma.customers.create({
      data: { organization_id: t.organizationId, code: `KH-${phone.slice(-4)}`, name: `Khách hàng ${t.organizationId.slice(0, 6)}`, phone },
    })
  }

  beforeEach(async () => {
    await resetDatabase()
    resetRateLimits()
    a = withQuotationCaps(await createTenant("alpha"))
    b = withQuotationCaps(await createTenant("beta"))
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("mã nội bộ BG-xxxx không mở được link công khai; mỗi báo giá có token riêng", async () => {
    const quoteA = await createQuotationUseCase(a.ctx, { items: [{ name: "Hoa của Alpha", qty: 1, unitPrice: 1 }] })
    const quoteB = await createQuotationUseCase(b.ctx, { items: [{ name: "Hoa của Beta", qty: 1, unitPrice: 1 }] })
    expect(quoteA.code).toBe(quoteB.code)
    expect(quoteA.publicToken).not.toBe(quoteB.publicToken)
    expect(quoteA.publicToken.length).toBeGreaterThanOrEqual(43)

    await sendQuotationUseCase(b.ctx, quoteB.id)
    expect((await openPublic(quoteB.code)).status).toBe(404)
    expect((await openPublic(quoteB.code.toLowerCase())).status).toBe(404)
  })

  it("token chỉ mở đúng báo giá của nó, không lộ số điện thoại hay ghi chú nội bộ", async () => {
    const custB = await customerOf(b, "0999000111")
    const quoteB = await createQuotationUseCase(b.ctx, {
      customerId: custB.id,
      notes: "Ghi chú nội bộ của Beta",
      items: [{ name: "Hoa của Beta", qty: 2, unitPrice: 150000 }],
    })
    await sendQuotationUseCase(b.ctx, quoteB.id)

    const { status, body } = await openPublic(quoteB.publicToken)
    expect(status).toBe(200)
    const data = body.data as Record<string, unknown>
    expect(data.recipientName).toBe(custB.name)
    expect(JSON.stringify(body)).not.toContain("0999000111")
    expect(JSON.stringify(body)).not.toContain("Ghi chú nội bộ")
    expect(data).not.toHaveProperty("organizationId")
  })

  it("báo giá nháp không xem được qua link công khai", async () => {
    const draft = await createQuotationUseCase(a.ctx, { items: [{ name: "Nháp", qty: 1, unitPrice: 1 }] })
    expect((await openPublic(draft.publicToken)).status).toBe(404)
  })

  it("không gắn được khách, lead, sản phẩm của tổ chức khác vào báo giá", async () => {
    const custB = await customerOf(b, "0999000222")
    const leadB = await prisma.leads.create({
      data: {
        organization_id: b.organizationId,
        name: "Lead Beta",
        phone: "0999000333",
        source: "MANUAL",
        consent_at: new Date(),
        consent_version: "v1",
      },
    })
    const productB = await prisma.products.create({
      data: { organization_id: b.organizationId, code: "SP-B1", name: "Sản phẩm Beta" },
    })

    const attempts = [
      { customerId: custB.id },
      { leadId: leadB.id },
      { items: [{ productId: productB.id, name: "x", qty: 1, unitPrice: 1 }] },
    ]
    for (const extra of attempts) {
      await expect(
        createQuotationUseCase(a.ctx, { items: [{ name: "x", qty: 1, unitPrice: 1 }], ...extra }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" })
    }
    expect(await prisma.quotations.count({ where: { organization_id: a.organizationId } })).toBe(0)

    const draftA = await createQuotationUseCase(a.ctx, { items: [{ name: "x", qty: 1, unitPrice: 1 }] })
    await expect(
      updateQuotationUseCase(a.ctx, draftA.id, { items: [{ productId: productB.id, name: "x", qty: 1, unitPrice: 1 }] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("dòng báo giá mang organization_id của báo giá; repository không sửa được báo giá tổ chức khác", async () => {
    const quoteA = await createQuotationUseCase(a.ctx, { items: [{ name: "Hoa", qty: 1, unitPrice: 1 }] })
    const items = await prisma.quotation_items.findMany({ where: { quotation_id: quoteA.id } })
    expect(items.map((it) => it.organization_id)).toEqual([a.organizationId])

    await expect(getQuotationRepository().update(b.ctx, quoteA.id, { notes: "B ghi đè" })).rejects.toThrow()
    const after = await prisma.quotations.findUniqueOrThrow({ where: { id: quoteA.id } })
    expect(after.notes).toBeNull()
  })

  it("hai lệnh chuyển thành đơn song song chỉ tạo đúng một đơn", async () => {
    const quoteA = await createQuotationUseCase(a.ctx, { items: [{ name: "Hoa", qty: 1, unitPrice: 200000 }] })
    await sendQuotationUseCase(a.ctx, quoteA.id)

    const results = await Promise.allSettled([
      convertQuotationToOrderUseCase(a.ctx, quoteA.id),
      convertQuotationToOrderUseCase(a.ctx, quoteA.id),
    ])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId, source: "QUOTATION" } })).toBe(1)
  })

  it("bốn yêu cầu tạo báo giá đồng thời đều thành công với mã khác nhau", async () => {
    const created = await Promise.all(
      [1, 2, 3, 4].map((n) => createQuotationUseCase(a.ctx, { items: [{ name: `Hoa ${n}`, qty: 1, unitPrice: 1 }] })),
    )
    expect(new Set(created.map((q) => q.code)).size).toBe(4)
  })
})
