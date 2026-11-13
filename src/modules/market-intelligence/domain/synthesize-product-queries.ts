/**
 * Domain Synthesizer: Chuyển đổi dữ liệu cấu trúc bóc tách nguyên tử của sản phẩm (Vision Output)
 * thành các cụm từ khóa nghiên cứu thị trường có chủ đích cao (Targeted Research Queries).
 * Đảm bảo Output của bước Vision AI trở thành Perfect Input cho Research Engine.
 * Thuần TypeScript — Zero external dependencies.
 */

import type {
  ProductFlowerComponent,
  ProductVisualAttributes,
  ProductPackaging,
  ProductInferredContext,
} from "./product-intelligence-types";

export interface SynthesizeQueryInput {
  productName?: string;
  components: ProductFlowerComponent[];
  attributes: ProductVisualAttributes;
  packaging?: ProductPackaging;
  context?: ProductInferredContext;
}

export interface SynthesizedResearchQueries {
  /** Từ khóa sản phẩm kết hợp hoa chủ đạo và tone màu chính */
  flowerColorQuery: string;
  /** Từ khóa phong cách thiết kế & kiểu cắm */
  styleQuery: string;
  /** Từ khóa ý định tìm kiếm theo dịp tặng quà */
  occasionQuery: string;
  /** Từ khóa bao gói & phụ kiện nổi bật */
  packagingQuery?: string | undefined;
  /** Danh sách các từ khóa chuẩn hóa (Clean keywords) dùng để kích hoạt bộ quét xu hướng */
  primaryKeywords: string[];
}

function cleanPhrase(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function synthesizeProductResearchQueries(
  input: SynthesizeQueryInput
): SynthesizedResearchQueries {
  const dominantFlower =
    input.components.find((c) => c.role === "dominant")?.flowerType ||
    input.components[0]?.flowerType ||
    "Sản phẩm";

  const cleanFlower = cleanPhrase(dominantFlower);
  const mainColor = input.attributes.mainColors[0] ? cleanPhrase(input.attributes.mainColors[0]) : "";
  const rawStyle = input.attributes.style || "";
  const styleMainPart = rawStyle.replace(/\(.*?\)/g, "").split(/&|\/|-/)[0]?.trim() || rawStyle;
  const cleanStyle = cleanPhrase(styleMainPart);
  const occasion = input.context?.likelyOccasions[0] ? cleanPhrase(input.context.likelyOccasions[0]) : "sinh nhật";

  // 1. Hoa + Màu sắc (vd: "hoa hồng pastel hồng", "hoa tulip cam cháy")
  const flowerColorQuery = mainColor ? `${cleanFlower} ${mainColor}` : cleanFlower;

  // 2. Hoa + Phong cách (vd: "bó hoa hồng romantic", "bó hoa tulip vintage")
  const styleQuery = cleanStyle ? `bó ${cleanFlower} ${cleanStyle}` : `bó ${cleanFlower}`;

  // 3. Dịp tặng quà (vd: "hoa tặng sinh nhật bạn gái", "hoa chúc mừng khai trương")
  const occasionQuery = `hoa tặng ${occasion}`;

  // 4. Chất liệu bao gói & Phụ kiện thiệp (nếu có)
  let packagingQuery: string | undefined;
  if (input.packaging?.card?.printedText) {
    const cleanCardText = cleanPhrase(input.packaging.card.printedText);
    if (cleanCardText.length > 3 && cleanCardText.length < 40) {
      packagingQuery = `hoa ${cleanCardText}`;
    }
  }
  if (!packagingQuery && input.packaging?.wrappingMaterial) {
    const cleanMaterial = cleanPhrase(input.packaging.wrappingMaterial);
    packagingQuery = `hoa bọc ${cleanMaterial}`;
  }

  // 5. Tổng hợp mảng từ khóa trọng tâm (không trùng lặp, tối đa 4 cụm)
  const querySet = new Set<string>();
  if (flowerColorQuery) querySet.add(flowerColorQuery);
  if (styleQuery) querySet.add(styleQuery);
  if (occasionQuery) querySet.add(occasionQuery);
  if (packagingQuery) querySet.add(packagingQuery);

  // Thêm từ khóa từ tên sản phẩm nếu có ý nghĩa
  if (input.productName) {
    const cleanTitle = cleanPhrase(input.productName);
    if (cleanTitle && cleanTitle.length > 5 && cleanTitle.length < 35) {
      querySet.add(cleanTitle);
    }
  }

  return {
    flowerColorQuery,
    styleQuery,
    occasionQuery,
    packagingQuery,
    primaryKeywords: Array.from(querySet).slice(0, 4),
  };
}
