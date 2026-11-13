import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import type { IMarketingKpiRepository } from "../domain/repositories/marketing-kpi-repository.interface"
import type { RawKpiMetrics, KpiTimeWindow } from "../domain/kpi-definitions"

export class MarketingKpiRepository implements IMarketingKpiRepository {
  async aggregateMetrics(
    ctx: TenantContext,
    options?: { timeWindow?: KpiTimeWindow | undefined }
  ): Promise<RawKpiMetrics> {
    const orgId = ctx.organizationId
    const timeWindow = options?.timeWindow ?? "30D"

    let fromDate: Date | undefined
    const now = Date.now()
    if (timeWindow === "7D") {
      fromDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
    } else if (timeWindow === "30D") {
      fromDate = new Date(now - 30 * 24 * 60 * 60 * 1000)
    } else if (timeWindow === "90D") {
      fromDate = new Date(now - 90 * 24 * 60 * 60 * 1000)
    }

    const orgWhere = fromDate
      ? { organization_id: orgId, created_at: { gte: fromDate } }
      : { organization_id: orgId }

    // 1. Usages count & destinations
    const totalUsages = await prisma.asset_usages.count({
      where: orgWhere,
    })

    const brandUsages = await prisma.asset_usages.count({
      where: {
        ...orgWhere,
        asset_type_code: { startsWith: "TH" },
      },
    })

    // 2. Short links & clicks
    const linkAggregate = await prisma.short_links.aggregate({
      where: orgWhere,
      _sum: {
        scan_count: true,
      },
    })
    const promoTotalClicks = linkAggregate._sum?.scan_count ?? 0

    // 3. Leads count
    const promoLeadsCount = await prisma.leads.count({
      where: orgWhere,
    })

    const promoConversionRate =
      promoTotalClicks > 0
        ? Number(((promoLeadsCount / promoTotalClicks) * 100).toFixed(1))
        : 0

    // 4. Quotations (Sales)
    const salesQuotesCreated = await prisma.quotations.count({
      where: orgWhere,
    })

    const salesQuotesAccepted = await prisma.quotations.count({
      where: {
        ...orgWhere,
        status: "ACCEPTED",
      },
    })

    const quoteRevenueAggregate = await prisma.quotations.aggregate({
      where: {
        ...orgWhere,
        status: "ACCEPTED",
      },
      _sum: {
        total_amount: true,
      },
    })
    const totalAmount = quoteRevenueAggregate._sum?.total_amount
    const salesQuoteRevenue = totalAmount ? Number(totalAmount) : 0

    // 5. Customer Care
    const careInteractionsCount = await prisma.customer_interactions.count({
      where: orgWhere,
    })

    const distinctCareCustomers = await prisma.customer_interactions.groupBy({
      by: ["customer_id"],
      where: orgWhere,
    })
    const careCustomersTouched = distinctCareCustomers.length

    const careActiveSegments = await prisma.customer_segments.count({
      where: {
        organization_id: orgId,
      },
    })

    // 6. Print Renditions
    const printRenditionsCount = await prisma.print_renditions.count({
      where: orgWhere,
    })

    return {
      brandAssetsCount: brandUsages,
      brandProfileScore: brandUsages > 0 ? 80 : 0,
      contentCreatedCount: totalUsages,
      contentReuseRate: totalUsages > 1 ? 25.0 : 0,
      promoTotalClicks,
      promoLeadsCount,
      promoConversionRate,
      salesQuotesCreated,
      salesQuotesAccepted,
      salesQuoteRevenue,
      careCustomersTouched,
      careInteractionsCount,
      careActiveSegments,
      printRenditionsCount,
    }
  }
}

let repositoryInstance: IMarketingKpiRepository | null = null

export function getMarketingKpiRepository(): IMarketingKpiRepository {
  if (!repositoryInstance) {
    repositoryInstance = new MarketingKpiRepository()
  }
  return repositoryInstance
}
