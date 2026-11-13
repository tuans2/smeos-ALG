/**
 * KPI Definitions & First-Touch Attribution Engine (Marketing & Sales Center).
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-7 (7.1).
 * Nguyên tắc:
 * 1. Quy thuộc first-touch qua link ngắn: một lead chỉ thuộc đúng một Usage (không tính trùng).
 * 2. Chỉ hiển thị chỉ số có dữ liệu; ẩn chỉ số chưa có dữ liệu.
 * 3. Mỗi module tối đa 3 chỉ số.
 * 4. Thuần túy domain logic, zero ORM.
 */

import type { BusinessModuleKey } from "./asset-type"
export type { BusinessModuleKey }

export {
  KPI_REGISTRY,
  type KpiDefinition,
  type KpiSource,
  type KpiTimeWindow,
} from "./kpi-registry"
import { KPI_REGISTRY } from "./kpi-registry"

export interface LeadAttributionInput {
  leadId: string
  shortLinkId: string | null
  createdAt: Date
}

export interface UsageAttributionInput {
  usageId: string
  shortLinkId: string | null
  createdAt: Date
  campaignId?: string | null | undefined
}

export interface LeadAttributionResult {
  leadId: string
  usageId: string | null
  shortLinkId: string | null
  campaignId: string | null
  attributedAt: Date
}

/**
 * Quy thuộc First-Touch qua Link ngắn (PO 01/11/2026, PR-7):
 * - Mỗi Lead chỉ thuộc DUY NHẤT một Usage (Usage có shortLinkId khớp được tạo sớm nhất).
 * - Tuyệt đối KHÔNG tính trùng lead cho nhiều Usage.
 * - Lead không có shortLinkId hoặc không khớp Usage nào sẽ có usageId = null.
 */
export function attributeLeadsFirstTouch(
  leads: readonly LeadAttributionInput[],
  usages: readonly UsageAttributionInput[]
): Map<string, LeadAttributionResult> {
  const result = new Map<string, LeadAttributionResult>()

  // Bản đồ tìm Usage sớm nhất cho từng shortLinkId
  // Sắp xếp Usages theo thời gian tạo tăng dần
  const sortedUsages = [...usages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )

  const firstUsageByShortLink = new Map<string, UsageAttributionInput>()
  for (const u of sortedUsages) {
    if (u.shortLinkId && !firstUsageByShortLink.has(u.shortLinkId)) {
      firstUsageByShortLink.set(u.shortLinkId, u)
    }
  }

  for (const lead of leads) {
    if (!lead.shortLinkId) {
      result.set(lead.leadId, {
        leadId: lead.leadId,
        usageId: null,
        shortLinkId: null,
        campaignId: null,
        attributedAt: lead.createdAt,
      })
      continue
    }

    const matchedUsage = firstUsageByShortLink.get(lead.shortLinkId)
    result.set(lead.leadId, {
      leadId: lead.leadId,
      usageId: matchedUsage ? matchedUsage.usageId : null,
      shortLinkId: lead.shortLinkId,
      campaignId: matchedUsage?.campaignId ?? null,
      attributedAt: lead.createdAt,
    })
  }

  return result
}

export interface RawKpiMetrics {
  brandAssetsCount?: number | undefined
  brandProfileScore?: number | undefined
  contentCreatedCount?: number | undefined
  contentReuseRate?: number | undefined
  promoTotalClicks?: number | undefined
  promoLeadsCount?: number | undefined
  promoConversionRate?: number | undefined
  salesQuotesCreated?: number | undefined
  salesQuotesAccepted?: number | undefined
  salesQuoteRevenue?: number | undefined
  careCustomersTouched?: number | undefined
  careInteractionsCount?: number | undefined
  careActiveSegments?: number | undefined
  printRenditionsCount?: number | undefined
}

export interface KpiValueItem {
  key: string
  module: BusinessModuleKey
  label: string
  description: string
  value: number
  unit: string
  formattedValue: string
}

export interface ModuleKpiStrip {
  module: BusinessModuleKey
  hasData: boolean
  items: KpiValueItem[]
}

function formatSimpleNumber(val: number): string {
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/**
 * Tổng hợp dải chỉ số KPI cho từng module:
 * - Chỉ trả về các chỉ số có dữ liệu (value > 0).
 * - Mỗi module tối đa 3 chỉ số.
 */
export function buildModuleKpis(metrics: RawKpiMetrics): Record<BusinessModuleKey, ModuleKpiStrip> {
  const allModules: BusinessModuleKey[] = ["brand", "content", "promotion", "sales", "care", "print"]
  const result: Record<BusinessModuleKey, ModuleKpiStrip> = {
    brand: { module: "brand", hasData: false, items: [] },
    content: { module: "content", hasData: false, items: [] },
    promotion: { module: "promotion", hasData: false, items: [] },
    sales: { module: "sales", hasData: false, items: [] },
    care: { module: "care", hasData: false, items: [] },
    print: { module: "print", hasData: false, items: [] },
  }

  const pushIfData = (key: string, value: number | undefined) => {
    if (value === undefined || value === null || value <= 0) return
    const def = KPI_REGISTRY.find((k) => k.key === key)
    if (!def) return

    const strip = result[def.module]!
    if (strip.items.length >= 3) return // Tối đa 3 số mỗi module

    let formattedValue = String(value)
    if (def.unit === "₫") {
      formattedValue = formatSimpleNumber(value) + " ₫"
    } else if (def.unit === "%") {
      formattedValue = `${value.toFixed(1)}%`
    } else {
      formattedValue = formatSimpleNumber(value)
    }

    strip.items.push({
      key: def.key,
      module: def.module,
      label: def.label,
      description: def.description,
      value,
      unit: def.unit,
      formattedValue,
    })
    strip.hasData = true
  }

  // 1. Brand
  pushIfData("brand_assets_count", metrics.brandAssetsCount)
  pushIfData("brand_profile_score", metrics.brandProfileScore)

  // 2. Content
  pushIfData("content_created_count", metrics.contentCreatedCount)
  pushIfData("content_reuse_rate", metrics.contentReuseRate)

  // 3. Promotion
  pushIfData("promo_total_clicks", metrics.promoTotalClicks)
  pushIfData("promo_leads_count", metrics.promoLeadsCount)
  pushIfData("promo_conversion_rate", metrics.promoConversionRate)

  // 4. Sales
  pushIfData("sales_quotes_created", metrics.salesQuotesCreated)
  pushIfData("sales_quotes_accepted", metrics.salesQuotesAccepted)
  pushIfData("sales_quote_revenue", metrics.salesQuoteRevenue)

  // 5. Care
  pushIfData("care_customers_touched", metrics.careCustomersTouched)
  pushIfData("care_interactions_count", metrics.careInteractionsCount)
  pushIfData("care_active_segments", metrics.careActiveSegments)

  // 6. Print
  pushIfData("print_renditions_count", metrics.printRenditionsCount)

  return result
}
