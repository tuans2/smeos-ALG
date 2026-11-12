import { describe, it, expect } from "vitest"
import {
  evaluateAdRating,
  computeCampaignMetrics,
  aggregateChannelPerformance,
  generateAdPerformanceSummary,
  exportAdPerformanceCSV,
  type RawCampaignInput,
} from "../ad-performance-analytics"

/** Dữ liệu thử cho luật tính (audit BL-23: không còn là dữ liệu của màn nào). */
const CAMPAIGNS: RawCampaignInput[] = [
  {
    id: "CAMP-FB-01",
    campaignName: "Hoa Khai Trương Phát Tài - Feed & Reels",
    channel: "FACEBOOK",
    impressions: 48500,
    clicks: 1940,
    spendVnd: 2800000,
    conversions: 18,
    revenueVnd: 15300000,
    status: "ACTIVE",
  },
  {
    id: "CAMP-TT-02",
    campaignName: "Sản Phẩm Sinh Nhật Pastel 30s Viral Video",
    channel: "TIKTOK",
    impressions: 92000,
    clicks: 3680,
    spendVnd: 3500000,
    conversions: 24,
    revenueVnd: 16800000,
    status: "ACTIVE",
  },
  {
    id: "CAMP-GG-03",
    campaignName: "Tìm kiếm 'Đặt sản phẩm giao nhanh Q1 Q3'",
    channel: "GOOGLE",
    impressions: 14200,
    clicks: 1136,
    spendVnd: 2200000,
    conversions: 15,
    revenueVnd: 12500000,
    status: "ACTIVE",
  },
  {
    id: "CAMP-ZL-04",
    campaignName: "Tin nhắn Zalo ZNS Chăm sóc Khách Cũ Kỷ Niệm",
    channel: "ZALO",
    impressions: 8500,
    clicks: 765,
    spendVnd: 950000,
    conversions: 11,
    revenueVnd: 8250000,
    status: "ACTIVE",
  },
  {
    id: "CAMP-FB-05",
    campaignName: "Sản Phẩm Cưới Cầm Tay Cô Dâu Tinh Khôi",
    channel: "FACEBOOK",
    impressions: 21000,
    clicks: 525,
    spendVnd: 1400000,
    conversions: 2,
    revenueVnd: 1800000,
    status: "PAUSED",
  },
]

describe("Ad Performance Analytics Engine (MK-10)", () => {
  describe("evaluateAdRating", () => {
    it("phân loại đúng các cấp độ ROAS", () => {
      expect(evaluateAdRating(4.5).rating).toBe("EXCELLENT")
      expect(evaluateAdRating(3.0).rating).toBe("GOOD")
      expect(evaluateAdRating(1.8).rating).toBe("AVERAGE")
      expect(evaluateAdRating(1.1).rating).toBe("UNDERPERFORMING")
    })
  })

  describe("computeCampaignMetrics", () => {
    it("tính toán chuẩn xác CTR, CPC, CPA, ROAS, ROI", () => {
      const raw: RawCampaignInput[] = [
        {
          id: "TEST-01",
          campaignName: "Test Campaign",
          channel: "FACEBOOK",
          impressions: 10000,
          clicks: 500, // CTR = 5%
          spendVnd: 1000000, // CPC = 2.000đ
          conversions: 10, // CPA = 100.000đ
          revenueVnd: 4000000, // ROAS = 4.0x, ROI = 300%
        },
      ]

      const computed = computeCampaignMetrics(raw)
      const first = computed[0]!
      expect(first.ctr).toBe(5)
      expect(first.cpc).toBe(2000)
      expect(first.cpa).toBe(100000)
      expect(first.roas).toBe(4)
      expect(first.roi).toBe(300)
      expect(first.rating).toBe("EXCELLENT")
    })
  })

  describe("aggregateChannelPerformance", () => {
    it("tổng hợp chỉ số chuẩn xác cho 4 kênh quảng cáo", () => {
      const computed = computeCampaignMetrics(CAMPAIGNS)
      const aggregates = aggregateChannelPerformance(computed)

      expect(aggregates).toHaveLength(4)
      const fb = aggregates.find((a) => a.channel === "FACEBOOK")
      expect(fb).toBeDefined()
      expect(fb?.campaignCount).toBe(2)
      expect(fb?.totalSpendVnd).toBe(4200000)
      expect(fb?.totalRevenueVnd).toBe(17100000)
      expect(fb?.netProfitVnd).toBe(12900000)
    })
  })

  describe("generateAdPerformanceSummary", () => {
    it("tổng hợp toàn diện các chỉ số và sinh khuyến nghị AI", () => {
      const summary = generateAdPerformanceSummary(CAMPAIGNS)

      expect(summary.totalSpendVnd).toBeGreaterThan(0)
      expect(summary.totalRevenueVnd).toBeGreaterThan(summary.totalSpendVnd)
      expect(summary.totalProfitVnd).toBe(summary.totalRevenueVnd - summary.totalSpendVnd)
      expect(summary.overallRoas).toBeGreaterThan(2.0)
      expect(summary.topPerformingCampaign).not.toBeNull()
      expect(summary.aiRecommendations.length).toBeGreaterThan(0)
    })
  })

  describe("exportAdPerformanceCSV", () => {
    it("sinh file CSV có chứa UTF-8 BOM và đầy đủ tiêu đề cột", () => {
      const computed = computeCampaignMetrics(CAMPAIGNS)
      const csv = exportAdPerformanceCSV(computed)

      expect(csv.startsWith("\uFEFF")).toBe(true)
      expect(csv).toContain("Mã chiến dịch")
      expect(csv).toContain("ROAS (lần)")
      expect(csv).toContain("Chi phí (VND)")
      expect(csv).toContain("TikTok Ads")
      expect(csv).toContain("Hoa Khai Trương")
    })
  })
})
