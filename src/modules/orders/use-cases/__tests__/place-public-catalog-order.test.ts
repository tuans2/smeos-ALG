import { describe, expect, it, vi } from "vitest"

import { placePublicCatalogOrder, type PublicOrderDeps } from "../place-public-catalog-order"

const product = { id: "p1", code: "HH01", name: "Bó hồng", price: 450_000 }
const input = { productId: "p1", quantity: 2, name: "Lan", phone: "0901234567", address: "12 Lê Lợi" }

function deps(over: Partial<PublicOrderDeps> & { page?: unknown } = {}): PublicOrderDeps & { ingest: ReturnType<typeof vi.fn> } {
  return {
    catalogLinks: { findBySlug: vi.fn(async () => ({ organization_id: "org-1", is_revoked: false })) } as never,
    catalog: vi.fn(async () => (over.page ?? { status: "ACTIVE", entryActions: { order: true, contact: true }, products: [product] })) as never,
    repo: { orgSettings: vi.fn(async () => ({ brochure_payment: { account_no: "0123", bank_name: "VCB" } })), countRecentByPhone: vi.fn(async () => 0), openLeadId: vi.fn(async () => "lead-1") },
    customers: { findOrCreateCustomer: vi.fn(async () => "c-1") },
    isMember: vi.fn(async () => false),
    ingest: vi.fn(async (_ctx, i: { items: { unitPriceVnd: number; quantity: number }[] }) => ({ code: "DH251031-0001", totalVnd: i.items[0]!.unitPriceVnd * i.items[0]!.quantity })) as never,
    verifier: { verify: vi.fn(async () => true) },
    now: () => new Date("2026-10-31T00:00:00Z"),
    acceptsOrders: vi.fn(async () => {}),
    ...over,
  } as never
}

describe("khách đặt hàng trên catalog công khai", () => {
  it("tổ chức suy từ catalog, giá tính ở máy chủ, gắn lead mở, trả thông tin chuyển khoản theo mã đơn", async () => {
    const d = deps()
    const r = await placePublicCatalogOrder("bst", input, "1.1.1.1", d)
    const [ctx, order] = d.ingest.mock.calls[0] as unknown as [{ organizationId: string }, { source: string; leadId: string; items: { unitPriceVnd: number }[] }]
    expect(ctx.organizationId).toBe("org-1")
    expect(order).toMatchObject({ source: "CATALOG", leadId: "lead-1" })
    expect(order.items[0]!.unitPriceVnd).toBe(450_000)
    expect(r).toMatchObject({ orderCode: "DH251031-0001", totalVnd: 900_000, needsQuote: false, payment: { accountNo: "0123", transferContent: "DH251031-0001" } })
  })

  it("trang landing ghi nguồn LANDING; mẫu chưa có giá → đơn chờ báo giá, không bịa giá", async () => {
    const d = deps({ page: { status: "ACTIVE", campaignConfig: {}, entryActions: { order: true, contact: true }, products: [{ ...product, price: null }] } })
    const r = await placePublicCatalogOrder("bst", input, undefined, d)
    expect((d.ingest.mock.calls[0] as unknown as [unknown, { source: string }])[1].source).toBe("LANDING")
    expect(r).toMatchObject({ needsQuote: true, payment: null })
  })

  it("Điều hành tắt nút Đặt hàng → 404; mẫu ngoài bộ sưu tập → 422; gửi dồn → chặn", async () => {
    await expect(placePublicCatalogOrder("bst", input, undefined, deps({ page: { status: "ACTIVE", entryActions: { order: false, contact: true }, products: [product] } }))).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(placePublicCatalogOrder("bst", { ...input, productId: "x" }, undefined, deps())).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    const flood = deps()
    ;(flood.repo.countRecentByPhone as ReturnType<typeof vi.fn>).mockResolvedValue(5)
    await expect(placePublicCatalogOrder("bst", input, undefined, flood)).rejects.toMatchObject({ code: "RATE_LIMITED" })
  })

  it("dữ liệu sai bị từ chối trước khi chạm cơ sở dữ liệu", async () => {
    const d = deps()
    await expect(placePublicCatalogOrder("bst", { ...input, phone: "12", quantity: 0, address: " " }, undefined, d)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(d.catalogLinks.findBySlug).not.toHaveBeenCalled()
  })

  // PO 07/11/2026 (Q11): không nhận ngày giao đã qua
  it("ngày giao đã qua → từ chối trước khi chạm cơ sở dữ liệu", async () => {
    const d = deps()
    await expect(placePublicCatalogOrder("bst", { ...input, deliveryDate: "2020-01-01" }, undefined, d)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      details: { deliveryDate: expect.stringContaining("đã qua") },
    })
    expect(d.catalogLinks.findBySlug).not.toHaveBeenCalled()
  })

  it("gói dịch vụ của cửa hàng quá hạn → không tạo đơn, không tạo khách", async () => {
    const paused = Object.assign(new Error("Cửa hàng đang tạm ngưng nhận đơn trực tuyến."), { code: "SUBSCRIPTION_OVERDUE" })
    const d = deps({ acceptsOrders: vi.fn(async () => { throw paused }) })
    await expect(placePublicCatalogOrder("bst", input, undefined, d)).rejects.toMatchObject({ code: "SUBSCRIPTION_OVERDUE" })
    expect(d.ingest).not.toHaveBeenCalled()
    expect(d.customers.findOrCreateCustomer).not.toHaveBeenCalled()
  })
})
