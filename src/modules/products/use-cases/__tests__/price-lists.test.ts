import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import type { PriceListInput } from "../../domain/price-list"
import type { IPricingRuleRepository, PricingRuleRecord } from "../../domain/repositories/pricing-rule-repository.interface"
import type { IProductRepository } from "../../domain/repositories/product-repository.interface"
import { archivePriceList, getPriceListDocument, listPriceLists, savePriceList, setPriceListActive } from "../price-lists"

vi.mock("@/modules/audit/use-cases/record-audit-log", () => ({ recordAuditLog: vi.fn(async () => undefined) }))

const ctx = { organizationId: "org-a", userId: "u1" } as TenantContext

/** Bảng chỉ chèn thêm: `currentRows` trả dòng mới nhất theo khoá, như repository thật. */
function memoryRepo(): IPricingRuleRepository & { rows: PricingRuleRecord[] } {
  const rows: PricingRuleRecord[] = []
  let t = 0
  return {
    rows,
    create: vi.fn(async (_ctx, input) => {
      const row = { id: `r${rows.length}`, organization_id: "org-a", branch_id: input.branchId, key: input.key, value: input.value, effective_from: new Date(++t), created_by: input.createdBy }
      rows.push(row)
      return row
    }),
    currentRows: vi.fn(async () => {
      const latest = new Map<string, PricingRuleRecord>()
      for (const r of [...rows].sort((a, b) => b.effective_from.getTime() - a.effective_from.getTime())) if (!latest.has(r.key)) latest.set(r.key, r)
      return [...latest.values()]
    }),
  }
}

const products = {
  list: vi.fn(async () => [
    { id: "p1", code: "P1", name: "Bó hồng", category: "Bó hoa", status: "ACTIVE", attributes: { pricing: { mode: "FIXED", price_vnd: 300000 } } },
  ]),
} as unknown as IProductRepository

const input: PriceListInput = { name: "Tết", heading: "", note: "", categories: [], productIds: null, validFrom: null, validTo: null, showPeakPrice: true, showPromotions: true, active: true }

describe("bảng giá sản phẩm", () => {
  it("tạo, tắt, sửa đều ghi dòng mới — lịch sử giữ nguyên", async () => {
    const repo = memoryRepo()
    const created = await savePriceList(ctx, null, input, repo)
    await setPriceListActive(ctx, created.id, false, repo)
    const edited = await savePriceList(ctx, created.id, { ...input, name: "Tết 2027", active: false }, repo)
    expect(repo.rows).toHaveLength(3)
    expect(edited).toMatchObject({ name: "Tết 2027", active: false, status: "PAUSED" })
    expect((await listPriceLists(ctx, repo, products)).data).toHaveLength(1)
  })

  it("xoá chỉ ẩn khỏi danh sách", async () => {
    const repo = memoryRepo()
    const { id } = await savePriceList(ctx, null, input, repo)
    await archivePriceList(ctx, id, repo)
    expect((await listPriceLists(ctx, repo, products)).data).toHaveLength(0)
    expect(repo.rows).toHaveLength(2)
    await expect(getPriceListDocument(ctx, id, repo, products, async () => [])).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("bảng giá dựng từ giá sản phẩm và kèm ưu đãi đang bật", async () => {
    const repo = memoryRepo()
    const { id } = await savePriceList(ctx, null, input, repo)
    const promos = [{ id: "promo-discount-10", title: "Giảm 10%", customerText: "Giảm 10% tổng đơn", kind: "PERCENT_OFF" as const, percent: 10 }]
    const doc = await getPriceListDocument(ctx, id, repo, products, async () => promos)
    expect(doc.groups[0]!.rows[0]).toMatchObject({ name: "Bó hồng", priceVnd: 300000 })
    expect(doc.promotions).toEqual(promos)
  })

  it("sửa bảng giá không có → 404; tên sai → lỗi theo trường", async () => {
    await expect(savePriceList(ctx, "khong-co", input, memoryRepo())).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(savePriceList(ctx, null, { ...input, name: "x" }, memoryRepo())).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })
})
