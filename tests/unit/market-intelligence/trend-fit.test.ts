import { describe, it, expect } from "vitest";
import { evaluateProductTrendFit } from "@/modules/market-intelligence/domain/trend-fit";

describe("Product Trend Fit Solver (v2.0)", () => {
  const sampleInput = {
    productName: "Bó hoa pastel hồng ngọt ngào",
    imageUrl: "/images/sample-flower.jpg",
    components: [
      { flowerType: "Hoa hồng ngoại", quantityEstimate: 12, unit: "cành", role: "dominant" as const },
      { flowerType: "Hoa baby trắng", quantityEstimate: 5, unit: "nhánh", role: "supporting" as const },
      { flowerType: "Lá bạc", quantityEstimate: 4, unit: "cành", role: "foliage" as const },
    ],
    attributes: {
      mainColors: ["Pastel hồng", "Trắng kem"],
      secondaryColors: ["Xanh lá"],
      style: "Romantic & Tinh tế",
      shape: "Bó tròn",
      sizeEstimate: "Tiêu chuẩn (M)",
    },
    packaging: {
      wrappingMaterial: "Giấy lụa mờ Kraft",
      wrappingColor: "Hồng nhạt",
      ribbon: "Ruy băng voan",
      accessories: ["Thiệp sinh nhật"],
    },
    context: {
      likelyOccasions: ["Sinh nhật", "Kỷ niệm"],
      likelyAudience: "Nữ giới 20–35 tuổi",
      suggestedPrice: 599000,
      confidence: 0.94,
    },
  };

  it("sinh báo cáo Product Intelligence với đủ 10 chủ đề nội dung cụ thể", () => {
    const report = evaluateProductTrendFit(sampleInput);

    expect(report.productName).toBe(sampleInput.productName);
    expect(report.topics).toHaveLength(10);
    expect(report.overallFit).toBe("HIGH");
    expect(report.trendFitMatrix.length).toBeGreaterThanOrEqual(4);
    expect(report.improvements.keep.length).toBeGreaterThan(0);
    expect(report.improvements.improve.length).toBeGreaterThan(0);
    expect(report.improvements.test.length).toBeGreaterThan(0);
    expect(report.readiness.trendFit).toBe(true);
  });

  it("chứa liên kết dẫn chứng và hook trong các chủ đề", () => {
    const report = evaluateProductTrendFit(sampleInput);
    const firstTopic = report.topics[0]!;

    expect(firstTopic.hook).toBeDefined();
    expect(firstTopic.format).toBe("REELS_TIKTOK_9_16");
    expect(firstTopic.cta).toBeDefined();
    expect(firstTopic.evidenceNote).toContain("SerpApi");
  });
});
