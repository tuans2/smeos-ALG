/** Dữ liệu mẫu dùng chung cho `examples` của nhiều chặng (không phải dữ liệu thật). */

export const EXAMPLE_ASSET_ID = "3f1c9a52-7d7e-4b8e-9d7a-1a2b3c4d5e6f"
export const EXAMPLE_PRODUCT_ID = "7a2d0e11-5b3c-4d2e-8f10-2b3c4d5e6f70"
export const EXAMPLE_RUN_ID = "9c8b7a65-4321-4fed-8cba-0987654321ab"
export const EXAMPLE_PACKAGE_ID = "c0ffee00-1111-4222-8333-444455556666"
export const EXAMPLE_JOB_ID = "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
export const EXAMPLE_NOW = "2026-09-24T08:00:00.000Z"

export const exampleComponents = [
  { flowerType: "Hoa hồng đỏ", quantityEstimate: 12, unit: "bông", role: "dominant" as const, color: "đỏ" },
  { flowerType: "Baby trắng", quantityEstimate: 5, unit: "cành", role: "supporting" as const, color: "trắng" },
  { flowerType: "Lá bạc", quantityEstimate: 4, unit: "cành", role: "foliage" as const },
]

export const exampleAttributes = {
  mainColors: ["đỏ"],
  secondaryColors: ["trắng", "xanh bạc"],
  style: "Lãng mạn",
  shape: "Bó tròn",
  sizeEstimate: "Trung (40cm)",
}

export const examplePackaging = {
  wrappingMaterial: "Giấy Hàn Quốc",
  wrappingColor: "đen",
  ribbon: "Ruy băng lụa đỏ",
  accessories: ["thiệp"],
  card: { hasCard: true, cardType: "Thiệp gập thiết kế" as const, printedText: "Happy Birthday" },
}

export const exampleContext = {
  likelyOccasions: ["Sinh nhật", "Kỷ niệm"],
  likelyAudience: "Nam 25–35 tặng người yêu",
  suggestedPrice: 650000,
  confidence: 0.82,
}

export const exampleTopic = {
  id: "topic-emotional-01",
  title: "12 bông hồng cho 12 tháng yêu nhau",
  angleCategory: "EMOTIONAL" as const,
  hook: "Bạn đã nói cảm ơn người ấy bao nhiêu lần năm nay?",
  format: "REELS_TIKTOK_9_16" as const,
  cta: "Nhắn tiệm để giữ sản phẩm cho ngày kỷ niệm",
  evidenceNote: "Chủ đề kỷ niệm tăng mạnh trên TikTok tuần này",
}

export const exampleReport = {
  id: EXAMPLE_RUN_ID,
  productName: "Bó hồng đỏ 12 bông",
  imageUrl: "/api/v1/assets/3f1c9a52-7d7e-4b8e-9d7a-1a2b3c4d5e6f/view-url",
  trendFitScore: 78,
  audienceFitScore: 84,
  contentFitScore: 80,
  overallFit: "HIGH" as const,
  components: exampleComponents,
  attributes: exampleAttributes,
  packaging: examplePackaging,
  context: exampleContext,
  trendFitMatrix: [
    {
      attribute: "Màu chủ đạo",
      productValue: "đỏ",
      marketSignal: "Đỏ trầm đang lên",
      matchStatus: "MATCH" as const,
      lifecycle: "GROWING" as const,
      note: "Giữ tông đỏ",
    },
  ],
  improvements: { keep: ["Tông đỏ"], improve: ["Thêm thiệp in tên"], test: ["Giấy gói kraft"] },
  topics: [exampleTopic],
  readiness: {
    productRecognition: true,
    trendFit: true,
    audienceDefined: true,
    positioningDefined: true,
    visualQuality: "ACCEPTABLE" as const,
    videoPotential: true,
  },
  createdAt: EXAMPLE_NOW,
}
