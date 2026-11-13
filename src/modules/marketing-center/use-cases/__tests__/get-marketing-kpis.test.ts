import { describe, expect, it } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { IMarketingKpiRepository } from "../../domain/repositories/marketing-kpi-repository.interface"
import type { RawKpiMetrics } from "../../domain/kpi-definitions"
import { getMarketingKpisUseCase } from "../get-marketing-kpis.use-case"

describe("getMarketingKpisUseCase (PO 01/11/2026, PR-7)", () => {
  const dummyCtx: TenantContext = {
    organizationId: "11111111-1111-4111-8111-111111111111",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "user-1",
    branchId: null,
    capabilities: new Set(["M1", "M2", "Q1"]),
  }

  it("tổng hợp và trả về dải KPI cho các module có dữ liệu", async () => {
    const mockRepo: IMarketingKpiRepository = {
      async aggregateMetrics(): Promise<RawKpiMetrics> {
        return {
          brandAssetsCount: 4,
          promoTotalClicks: 120,
          promoLeadsCount: 15,
          promoConversionRate: 12.5,
          salesQuotesCreated: 10,
          salesQuotesAccepted: 6,
          salesQuoteRevenue: 8500000,
          printRenditionsCount: 12,
        }
      },
    }

    const result = await getMarketingKpisUseCase(dummyCtx, { timeWindow: "30D" }, mockRepo)

    expect(result.brand!.hasData).toBe(true)
    expect(result.brand!.items.length).toBe(1)
    expect(result.brand!.items[0]!.value).toBe(4)

    expect(result.promotion!.hasData).toBe(true)
    expect(result.promotion!.items.length).toBe(3)
    expect(result.promotion!.items[1]!.value).toBe(15)

    expect(result.sales!.hasData).toBe(true)
    expect(result.sales!.items.length).toBe(3)
    expect(result.sales!.items[2]!.formattedValue).toBe("8.500.000 ₫")

    expect(result.print!.hasData).toBe(true)
    expect(result.print!.items[0]!.value).toBe(12)

    // Module care chưa có tương tác -> hasData là false và items rỗng
    expect(result.care!.hasData).toBe(false)
    expect(result.care!.items.length).toBe(0)
  })
})

