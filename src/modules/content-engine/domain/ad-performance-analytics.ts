/**
 * Ad Performance Analytics Engine (MK-10).
 * Phân tích hiệu quả chiến dịch quảng cáo đa kênh: Facebook Ads, TikTok Ads, Google Ads, Zalo Ads.
 * Tính toán chuẩn xác các chỉ số: CTR, CPC, CPA, ROAS, ROI, Rating và Khuyến nghị tối ưu ngân sách AI.
 */

export type AdChannel = "FACEBOOK" | "TIKTOK" | "GOOGLE" | "ZALO"

export type AdRating = "EXCELLENT" | "GOOD" | "AVERAGE" | "UNDERPERFORMING"

export interface RawCampaignInput {
  id: string
  campaignName: string
  channel: AdChannel
  impressions: number
  clicks: number
  spendVnd: number
  conversions: number
  revenueVnd: number
  startDate?: string
  status?: "ACTIVE" | "PAUSED" | "COMPLETED"
}

export interface CampaignMetric extends RawCampaignInput {
  ctr: number // Click-Through Rate (%)
  cpc: number // Cost Per Click (VND)
  cpa: number // Cost Per Acquisition / Đơn hàng (VND)
  roas: number // Return on Ad Spend (e.g. 4.2x)
  roi: number // Return on Investment (%)
  rating: AdRating
  recommendation: string
}

export interface ChannelAggregate {
  channel: AdChannel
  channelName: string
  campaignCount: number
  totalImpressions: number
  totalClicks: number
  totalSpendVnd: number
  totalConversions: number
  totalRevenueVnd: number
  avgCtr: number
  avgCpc: number
  avgCpa: number
  avgRoas: number
  netProfitVnd: number
}

export interface AdPerformanceSummary {
  totalSpendVnd: number
  totalRevenueVnd: number
  totalProfitVnd: number
  totalOrders: number
  overallRoas: number
  overallCpa: number
  overallCtr: number
  channelAggregates: ChannelAggregate[]
  topPerformingCampaign: CampaignMetric | null
  aiRecommendations: string[]
}

/**
 * Đánh giá xếp hạng chiến dịch theo ROAS ngành hoa
 */
export function evaluateAdRating(roas: number): { rating: AdRating; recommendation: string } {
  if (roas >= 4.0) {
    return {
      rating: "EXCELLENT",
      recommendation: "Chiến dịch sinh lời vượt trội (ROAS ≥ 4.0x). Khuyến nghị tăng ngân sách +20–30%.",
    }
  }
  if (roas >= 2.5) {
    return {
      rating: "GOOD",
      recommendation: "Hiệu quả tốt (ROAS ≥ 2.5x). Tiếp tục duy trì và nhân bản sang nhóm đối tượng tương tự.",
    }
  }
  if (roas >= 1.5) {
    return {
      rating: "AVERAGE",
      recommendation: "Hiệu quả trung bình hòa vốn. Cần tối ưu hình ảnh sản phẩm và nội dung giật tít.",
    }
  }
  return {
    rating: "UNDERPERFORMING",
    recommendation: "Hiệu quả kém, chi phí cao hơn doanh thu. Nên tạm dừng hoặc đổi góc tiếp cận khác.",
  }
}

/**
 * Tính toán toàn bộ chỉ số cho từng chiến dịch quảng cáo
 */
export function computeCampaignMetrics(rawList: RawCampaignInput[]): CampaignMetric[] {
  return rawList.map((c) => {
    const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
    const cpc = c.clicks > 0 ? c.spendVnd / c.clicks : 0
    const cpa = c.conversions > 0 ? c.spendVnd / c.conversions : 0
    const roas = c.spendVnd > 0 ? c.revenueVnd / c.spendVnd : 0
    const roi = c.spendVnd > 0 ? ((c.revenueVnd - c.spendVnd) / c.spendVnd) * 100 : 0

    const { rating, recommendation } = evaluateAdRating(roas)

    return {
      ...c,
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc),
      cpa: Math.round(cpa),
      roas: Math.round(roas * 100) / 100,
      roi: Math.round(roi * 10) / 10,
      rating,
      recommendation,
    }
  })
}

const CHANNEL_LABELS: Record<AdChannel, string> = {
  FACEBOOK: "Facebook Ads",
  TIKTOK: "TikTok Ads",
  GOOGLE: "Google Ads",
  ZALO: "Zalo Ads",
}

/**
 * Tổng hợp chỉ số theo từng nền tảng quảng cáo
 */
export function aggregateChannelPerformance(campaigns: CampaignMetric[]): ChannelAggregate[] {
  const channels: AdChannel[] = ["FACEBOOK", "TIKTOK", "GOOGLE", "ZALO"]

  return channels.map((ch) => {
    const list = campaigns.filter((c) => c.channel === ch)
    const count = list.length
    const totalImpressions = list.reduce((sum, c) => sum + c.impressions, 0)
    const totalClicks = list.reduce((sum, c) => sum + c.clicks, 0)
    const totalSpendVnd = list.reduce((sum, c) => sum + c.spendVnd, 0)
    const totalConversions = list.reduce((sum, c) => sum + c.conversions, 0)
    const totalRevenueVnd = list.reduce((sum, c) => sum + c.revenueVnd, 0)

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCpc = totalClicks > 0 ? totalSpendVnd / totalClicks : 0
    const avgCpa = totalConversions > 0 ? totalSpendVnd / totalConversions : 0
    const avgRoas = totalSpendVnd > 0 ? totalRevenueVnd / totalSpendVnd : 0

    return {
      channel: ch,
      channelName: CHANNEL_LABELS[ch],
      campaignCount: count,
      totalImpressions,
      totalClicks,
      totalSpendVnd,
      totalConversions,
      totalRevenueVnd,
      avgCtr: Math.round(avgCtr * 100) / 100,
      avgCpc: Math.round(avgCpc),
      avgCpa: Math.round(avgCpa),
      avgRoas: Math.round(avgRoas * 100) / 100,
      netProfitVnd: totalRevenueVnd - totalSpendVnd,
    }
  })
}

/**
 * Tạo báo cáo tổng hợp toàn bộ hiệu quả quảng cáo (MK-10)
 */
export function generateAdPerformanceSummary(rawList: RawCampaignInput[]): AdPerformanceSummary {
  const campaigns = computeCampaignMetrics(rawList)
  const channelAggregates = aggregateChannelPerformance(campaigns)

  const totalSpendVnd = campaigns.reduce((sum, c) => sum + c.spendVnd, 0)
  const totalRevenueVnd = campaigns.reduce((sum, c) => sum + c.revenueVnd, 0)
  const totalOrders = campaigns.reduce((sum, c) => sum + c.conversions, 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0)
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0)

  const overallRoas = totalSpendVnd > 0 ? totalRevenueVnd / totalSpendVnd : 0
  const overallCpa = totalOrders > 0 ? totalSpendVnd / totalOrders : 0
  const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  const sortedByRoas = [...campaigns].sort((a, b) => b.roas - a.roas)
  const topPerformingCampaign = sortedByRoas.length > 0 ? (sortedByRoas[0] ?? null) : null

  // Đề xuất AI
  const aiRecommendations: string[] = []
  if (overallRoas >= 3.0) {
    aiRecommendations.push("Chiến dịch tổng thể đang rất hiệu quả, tỷ suất hoàn vốn cao (ROAS > 3.0x).")
  }
  const bestChannel = [...channelAggregates].sort((a, b) => b.avgRoas - a.avgRoas)[0]
  if (bestChannel && bestChannel.totalSpendVnd > 0) {
    aiRecommendations.push(
      `Kênh "${bestChannel.channelName}" đang dẫn đầu với ROAS đạt ${bestChannel.avgRoas}x. Khuyến nghị ưu tiên 60% ngân sách cho kênh này.`
    )
  }
  const lowCampaigns = campaigns.filter((c) => c.rating === "UNDERPERFORMING")
  if (lowCampaigns.length > 0) {
    aiRecommendations.push(
      `Có ${lowCampaigns.length} chiến dịch đang có ROAS dưới 1.5x. Khuyến nghị tạm dừng hoặc thay đổi hình ảnh đại diện.`
    )
  }

  return {
    totalSpendVnd,
    totalRevenueVnd,
    totalProfitVnd: totalRevenueVnd - totalSpendVnd,
    totalOrders,
    overallRoas: Math.round(overallRoas * 100) / 100,
    overallCpa: Math.round(overallCpa),
    overallCtr: Math.round(overallCtr * 100) / 100,
    channelAggregates,
    topPerformingCampaign,
    aiRecommendations,
  }
}

/**
 * Xuất dữ liệu báo cáo quảng cáo CSV định dạng UTF-8 BOM chuẩn tiếng Việt
 */
export function exportAdPerformanceCSV(campaigns: CampaignMetric[]): string {
  const BOM = "\uFEFF"
  const headers = [
    "Mã chiến dịch",
    "Tên chiến dịch",
    "Nền tảng",
    "Lượt hiển thị",
    "Lượt nhấp",
    "CTR (%)",
    "Chi phí (VND)",
    "CPC (VND)",
    "Số đơn hàng",
    "CPA (VND)",
    "Doanh thu (VND)",
    "ROAS (lần)",
    "ROI (%)",
    "Đánh giá",
    "Khuyến nghị",
  ]

  const rows = campaigns.map((c) => [
    `"${c.id}"`,
    `"${c.campaignName.replace(/"/g, '""')}"`,
    `"${CHANNEL_LABELS[c.channel]}"`,
    c.impressions,
    c.clicks,
    `${c.ctr}%`,
    c.spendVnd,
    c.cpc,
    c.conversions,
    c.cpa,
    c.revenueVnd,
    `${c.roas}x`,
    `${c.roi}%`,
    `"${c.rating}"`,
    `"${c.recommendation.replace(/"/g, '""')}"`,
  ])

  return BOM + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
}
