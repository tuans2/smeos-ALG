import { describe, it, expect } from "vitest";
import { synthesizeProductResearchQueries } from "@/modules/market-intelligence/domain/synthesize-product-queries";

describe("synthesizeProductResearchQueries Domain Synthesizer", () => {
  it("chuyển đổi hoàn hảo cấu trúc bóc tách Vision thành bộ từ khóa nghiên cứu sát sườn", () => {
    const input = {
      productName: "Bó hoa hồng pastel kem dâu phong cách Hàn Quốc",
      components: [
        { flowerType: "Hoa hồng kem dâu", quantityEstimate: 12, unit: "cành", role: "dominant" as const },
        { flowerType: "Hoa baby trắng", quantityEstimate: 5, unit: "nhánh", role: "supporting" as const },
        { flowerType: "Lá bạc Eucalyptus", quantityEstimate: 3, unit: "cành", role: "foliage" as const },
      ],
      attributes: {
        mainColors: ["Pastel hồng", "Trắng kem"],
        secondaryColors: ["Xanh lá"],
        style: "Romantic & Tinh tế (Hàn Quốc)",
        shape: "Bó tròn tự nhiên",
        sizeEstimate: "Tiêu chuẩn (M)",
      },
      packaging: {
        wrappingMaterial: "Giấy lụa mờ Kraft",
        wrappingColor: "Hồng phấn",
        ribbon: "Ruy băng voan",
        accessories: ["Thiệp chúc mừng"],
      },
      context: {
        likelyOccasions: ["Sinh nhật bạn gái", "Kỷ niệm ngày cưới"],
        likelyAudience: "Nữ giới 20-35 tuổi",
        suggestedPrice: 599000,
        confidence: 0.94,
      },
    };

    const queries = synthesizeProductResearchQueries(input);

    expect(queries.flowerColorQuery).toBe("hoa hồng kem dâu pastel hồng");
    expect(queries.styleQuery).toBe("bó hoa hồng kem dâu romantic");
    expect(queries.occasionQuery).toBe("hoa tặng sinh nhật bạn gái");
    expect(queries.packagingQuery).toBe("hoa bọc giấy lụa mờ kraft");
    expect(queries.primaryKeywords.length).toBeGreaterThanOrEqual(3);
    expect(queries.primaryKeywords).toContain("hoa hồng kem dâu pastel hồng");
    expect(queries.primaryKeywords).toContain("hoa tặng sinh nhật bạn gái");
  });

  it("xử lý an toàn khi thiếu thuộc tính tùy chọn", () => {
    const input = {
      components: [
        { flowerType: "Hoa tulip", quantityEstimate: 10, unit: "cành", role: "dominant" as const },
      ],
      attributes: {
        mainColors: ["Cam cháy"],
        secondaryColors: [],
        style: "Vintage",
        shape: "Bó dài",
        sizeEstimate: "L",
      },
    };

    const queries = synthesizeProductResearchQueries(input);

    expect(queries.flowerColorQuery).toBe("hoa tulip cam cháy");
    expect(queries.styleQuery).toBe("bó hoa tulip vintage");
    expect(queries.occasionQuery).toBe("hoa tặng sinh nhật");
    expect(queries.packagingQuery).toBeUndefined();
    expect(queries.primaryKeywords).toContain("hoa tulip cam cháy");
  });

  it("tận dụng nội dung thiệp chúc mừng printedText để sinh từ khóa mục đích sử dụng", () => {
    const input = {
      components: [
        { flowerType: "Hoa hồng đỏ", quantityEstimate: 15, unit: "cành", role: "dominant" as const },
      ],
      attributes: {
        mainColors: ["Đỏ nhung"],
        secondaryColors: [],
        style: "Classic",
        shape: "Bó tròn",
        sizeEstimate: "M",
      },
      packaging: {
        wrappingMaterial: "Giấy xi măng",
        wrappingColor: "Nâu",
        ribbon: "Ruy băng đỏ",
        accessories: ["Thiệp"],
        card: {
          hasCard: true,
          printedText: "Chúc mừng ngày 20 10",
        },
      },
    };

    const queries = synthesizeProductResearchQueries(input);
    expect(queries.packagingQuery).toBe("hoa chúc mừng ngày 20 10");
    expect(queries.primaryKeywords).toContain("hoa chúc mừng ngày 20 10");
  });
});
