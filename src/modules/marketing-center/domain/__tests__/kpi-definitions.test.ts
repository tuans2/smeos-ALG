import { describe, expect, it } from "vitest"
import {
  attributeLeadsFirstTouch,
  buildModuleKpis,
  KPI_REGISTRY,
  type LeadAttributionInput,
  type UsageAttributionInput,
  type RawKpiMetrics,
} from "../kpi-definitions"

describe("Marketing Center KPI Definitions & First-Touch Attribution (PO 01/11/2026, PR-7)", () => {
  it("KPI Registry có đủ các chỉ số cho 6 modules", () => {
    expect(KPI_REGISTRY.length).toBeGreaterThanOrEqual(10)

    const modules = new Set(KPI_REGISTRY.map((k) => k.module))
    expect(modules.has("brand")).toBe(true)
    expect(modules.has("content")).toBe(true)
    expect(modules.has("promotion")).toBe(true)
    expect(modules.has("sales")).toBe(true)
    expect(modules.has("care")).toBe(true)
    expect(modules.has("print")).toBe(true)

    // Kiểm tra không chứa thuật ngữ cấm hoặc rỗng
    for (const kpi of KPI_REGISTRY) {
      expect(kpi.label.length).toBeGreaterThan(0)
      expect(kpi.formula.length).toBeGreaterThan(0)
      expect(kpi.description.length).toBeGreaterThan(0)
    }
  })

  it("Quy thuộc First-Touch qua link ngắn: một lead chỉ thuộc đúng 1 Usage sớm nhất", () => {
    const usages: UsageAttributionInput[] = [
      {
        usageId: "usage-late",
        shortLinkId: "link-1",
        createdAt: new Date("2026-11-01T12:00:00Z"),
        campaignId: "campaign-b",
      },
      {
        usageId: "usage-early",
        shortLinkId: "link-1",
        createdAt: new Date("2026-11-01T08:00:00Z"), // Sớm nhất cho link-1
        campaignId: "campaign-a",
      },
      {
        usageId: "usage-other",
        shortLinkId: "link-2",
        createdAt: new Date("2026-11-01T09:00:00Z"),
      },
    ]

    const leads: LeadAttributionInput[] = [
      {
        leadId: "lead-1",
        shortLinkId: "link-1",
        createdAt: new Date("2026-11-01T14:00:00Z"),
      },
      {
        leadId: "lead-2",
        shortLinkId: "link-2",
        createdAt: new Date("2026-11-01T15:00:00Z"),
      },
      {
        leadId: "lead-orphan",
        shortLinkId: null,
        createdAt: new Date("2026-11-01T16:00:00Z"),
      },
      {
        leadId: "lead-unmatched",
        shortLinkId: "link-unknown",
        createdAt: new Date("2026-11-01T17:00:00Z"),
      },
    ]

    const attributed = attributeLeadsFirstTouch(leads, usages)

    // Lead 1 phải quy thuộc về usage-early (vì usage-early tạo lúc 08:00, trước 12:00)
    const att1 = attributed.get("lead-1")
    expect(att1).toBeDefined()
    expect(att1?.usageId).toBe("usage-early")
    expect(att1?.campaignId).toBe("campaign-a")

    // Lead 2 quy thuộc về usage-other
    const att2 = attributed.get("lead-2")
    expect(att2?.usageId).toBe("usage-other")

    // Lead không có shortLinkId -> usageId là null
    const attOrphan = attributed.get("lead-orphan")
    expect(attOrphan?.usageId).toBeNull()

    // Lead có link nhưng không khớp usage nào -> usageId là null
    const attUnmatched = attributed.get("lead-unmatched")
    expect(attUnmatched?.usageId).toBeNull()

    // Không tính trùng: mỗi lead chỉ có 1 kết quả
    expect(attributed.size).toBe(4)
  })

  it("buildModuleKpis: chỉ trả chỉ số có dữ liệu (>0) và tối đa 3 chỉ số mỗi module", () => {
    const rawMetrics: RawKpiMetrics = {
      brandAssetsCount: 5,
      brandProfileScore: 0, // Chưa có dữ liệu -> ẩn
      contentCreatedCount: 20,
      contentReuseRate: 35.5,
      promoTotalClicks: 150,
      promoLeadsCount: 12,
      promoConversionRate: 8.0,
      salesQuotesCreated: 15,
      salesQuotesAccepted: 9,
      salesQuoteRevenue: 15500000,
      careCustomersTouched: 45,
      careInteractionsCount: 68,
      careActiveSegments: 3,
      printRenditionsCount: 8,
    }

    const kpis = buildModuleKpis(rawMetrics)

    // Brand: có 1 chỉ số, 1 chỉ số = 0 bị ẩn
    expect(kpis.brand!.hasData).toBe(true)
    expect(kpis.brand!.items.length).toBe(1)
    expect(kpis.brand!.items[0]!.key).toBe("brand_assets_count")
    expect(kpis.brand!.items[0]!.value).toBe(5)

    // Promotion: đủ 3 chỉ số
    expect(kpis.promotion!.items.length).toBe(3)
    expect(kpis.promotion!.items[0]!.formattedValue).toBe("150")
    expect(kpis.promotion!.items[2]!.formattedValue).toBe("8.0%")

    // Sales: định dạng tiền tệ Việt Nam
    expect(kpis.sales!.items[2]!.key).toBe("sales_quote_revenue")
    expect(kpis.sales!.items[2]!.formattedValue).toBe("15.500.000 ₫")

    // Care: tối đa 3 chỉ số
    expect(kpis.care!.items.length).toBe(3)

    // Print: 1 chỉ số
    expect(kpis.print!.items.length).toBe(1)
    expect(kpis.print!.items[0]!.formattedValue).toBe("8")
  })

  it("buildModuleKpis: module không có dữ liệu thì hasData là false và items rỗng", () => {
    const emptyMetrics: RawKpiMetrics = {}
    const kpis = buildModuleKpis(emptyMetrics)

    for (const mod of ["brand", "content", "promotion", "sales", "care", "print"] as const) {
      expect(kpis[mod]!.hasData).toBe(false)
      expect(kpis[mod]!.items.length).toBe(0)
    }
  })
})

