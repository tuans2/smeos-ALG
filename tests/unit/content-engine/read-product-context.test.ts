import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { ProductIntelligenceReport } from "@/modules/market-intelligence/domain/product-intelligence-types"

const { getProductAnalysisRun, findFirst, analysisFindFirst, copyFindFirst } = vi.hoisted(() => ({
  getProductAnalysisRun: vi.fn(),
  findFirst: vi.fn(),
  analysisFindFirst: vi.fn(),
  copyFindFirst: vi.fn(),
}))
vi.mock("@/modules/market-intelligence/infra/market-intelligence-repository", () => {
  const mocked = {
    MarketIntelligenceRepository: vi.fn().mockImplementation(function () { return { getProductAnalysisRun } }),
  }
  return { ...mocked, getMarketIntelligenceRepository: vi.fn(() => new mocked.MarketIntelligenceRepository()) }
})
vi.mock("@/core/tenancy/infra/prisma", () => ({
  prisma: { products: { findFirst }, product_analyses: { findFirst: analysisFindFirst }, product_copies: { findFirst: copyFindFirst } },
}))

import { readProductContext, projectTopicFromReport } from "@/modules/content-engine/infra/read-product-context"

const ctx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["I1"]),
}

const report: ProductIntelligenceReport = {
  id: "report-1",
  productName: "Bó hoa hồng đỏ 20 cành",
  imageUrl: "https://example.com/a.jpg",
  trendFitScore: 80,
  audienceFitScore: 80,
  contentFitScore: 80,
  overallFit: "HIGH",
  components: [{ flowerType: "Hồng đỏ", quantityEstimate: 20, unit: "cành", role: "dominant", color: "đỏ" }],
  attributes: { mainColors: ["đỏ"], secondaryColors: [], style: "cổ điển", shape: "tròn", sizeEstimate: "vừa" },
  packaging: { wrappingMaterial: "giấy kraft", wrappingColor: "nâu", ribbon: "lụa đỏ", accessories: ["thiệp"], card: { hasCard: true, printedText: "Chúc mừng!" } },
  context: { likelyOccasions: ["sinh nhật"], likelyAudience: "người yêu", suggestedPrice: 650000, confidence: 0.8 },
  commercialPassport: {
    suggestedName: "Bó hoa hồng đỏ",
    shortHeadline: "",
    description: "",
    style: "cổ điển",
    tags: [],
    seoKeywords: [],
    occasions: ["sinh nhật"],
    targetAudience: { recipient: "người yêu", buyerPersona: "nam 25-40" },
    flowerMeaningStory: "Hoa hồng đỏ tượng trưng cho tình yêu.",
    keySellingPoints: ["Hoa nhập khẩu tuyển chọn"],
    cardMessageSuggestions: { romantic: "Anh yêu em!", subtle: "", congratulatory: "" },
    careInstructions: ["Thay nước mỗi 2 ngày"],
    priceSegment: "standard",
    priceRange: { minPrice: 550000, targetPrice: 650000, maxPrice: 750000 },
    recommendedUpsells: [],
  },
  trendFitMatrix: [],
  improvements: {} as never,
  topics: [
    { id: "topic-1", title: "Bó hoa sinh nhật tone đỏ", angleCategory: "EMOTIONAL" as never, hook: "Món quà nói hộ lời yêu thương", format: "REELS_TIKTOK_9_16", cta: "Nhắn tin đặt ngay", evidenceNote: "" },
  ],
  readiness: {} as never,
  createdAt: new Date().toISOString(),
}

describe("readProductContext", () => {
  it("có analysisRunId: lắp product+passport đầy đủ từ report", async () => {
    getProductAnalysisRun.mockResolvedValue({ report })
    const result = await readProductContext(ctx, { analysisRunId: "run-1", productId: "prod-1" })
    expect(result.product.name).toBe("Bó hoa hồng đỏ 20 cành")
    expect(result.product.components).toHaveLength(1)
    expect(result.product.packaging.cardText).toBe("Chúc mừng!")
    expect(result.product.price.exact).toBe(650000)
    expect(result.passport?.flowerMeaningStory).toContain("tình yêu")
  })

  it("không có analysisRunId, có productId: lùi về tên trong bảng products, không suy đoán phần còn lại", async () => {
    getProductAnalysisRun.mockResolvedValue(null)
    findFirst.mockResolvedValue({ id: "prod-2", name: "Bó hoa ly trắng", attributes: null })
    analysisFindFirst.mockResolvedValue(null)
    copyFindFirst.mockResolvedValue(null)
    const result = await readProductContext(ctx, { productId: "prod-2" })
    expect(result.product.name).toBe("Bó hoa ly trắng")
    expect(result.product.components).toEqual([])
    expect(result.passport).toBeNull()
  })

  it("không có báo cáo thị trường nhưng có dữ liệu ĐÃ DUYỆT (Bài giới thiệu) → Brief dùng dữ liệu đó, chỉ đọc bản đã duyệt", async () => {
    getProductAnalysisRun.mockResolvedValue(null)
    findFirst.mockResolvedValue({ id: "prod-3", name: "SP-3", attributes: null })
    analysisFindFirst.mockResolvedValue(null)
    copyFindFirst.mockResolvedValue({ raw: { suggested_name: "Bó ly Thuần Khiết", key_selling_points: ["Ly trắng nhập"] }, edited: null })
    const result = await readProductContext(ctx, { productId: "prod-3" })
    expect(result.product.name).toBe("Bó ly Thuần Khiết")
    expect(result.passport?.sellingPoints).toEqual(["Ly trắng nhập"])
    expect(copyFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { organization_id: "org-1", product_id: "prod-3", approval_state: "APPROVED" },
    }))
  })

  it("không có gì cả: tên mặc định trung tính, mọi thứ khác rỗng", async () => {
    getProductAnalysisRun.mockResolvedValue(null)
    findFirst.mockResolvedValue(null)
    const result = await readProductContext(ctx, {})
    expect(result.product.name).toBe("Sản phẩm") // trung tính đa ngành (7189612e)
    expect(result.product.price.exact).toBeNull()
  })
})

describe("projectTopicFromReport", () => {
  it("tìm đúng theo topicId", () => {
    const topic = projectTopicFromReport(report, "topic-1")
    expect(topic?.title).toBe("Bó hoa sinh nhật tone đỏ")
  })
  it("không truyền topicId: lấy chủ đề đầu tiên", () => {
    expect(projectTopicFromReport(report)?.topicId).toBe("topic-1")
  })
  it("không có report: null", () => {
    expect(projectTopicFromReport(null, "topic-1")).toBeNull()
  })
})
