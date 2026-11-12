/**
 * Domain Types: Product Intelligence (Trụ cột B của ALG Intelligence Engine v2.0).
 * Tuân thủ mục 8-19 của tài liệu ALG-Intelligence-Engine_FINAL_v2.0.md.
 * Thuần TypeScript — Zero external dependencies.
 */

import type { TrendLifecycle } from "./trend-lifecycle";

export interface ProductFlowerComponent {
  id?: string | undefined;
  flowerType: string;
  quantityEstimate: number;
  unit: string;
  role: "dominant" | "supporting" | "foliage";
  color?: string | undefined;
}

export interface ProductVisualAttributes {
  mainColors: string[];
  secondaryColors: string[];
  style: string;
  shape: string;
  sizeEstimate: string;
}

export interface ProductCardAccessory {
  hasCard: boolean;
  cardType?: "Thiệp gập thiết kế" | "Tag cắm mini" | "Biển mica nghệ thuật" | "Banner dải băng chữ" | "Khác" | undefined;
  printedText?: string | undefined; // Chữ in/viết bóc tách qua Vision OCR
  color?: string | undefined;
}

export interface ProductRibbonAccessory {
  ribbonColor?: string | undefined;
  ribbonMaterial?: string | undefined;
  bowStyle?: string | undefined;
}

export interface ProductDecorAccessory {
  id?: string | undefined;
  name: string;
  quantity: number;
  unit: string;
  color?: string | undefined;
  note?: string | undefined;
}

export interface ProductPackaging {
  wrappingMaterial: string;
  wrappingColor: string;
  ribbon: string;
  accessories: string[];
  // Mở rộng nguyên tử (Atomic Disaggregated Fields)
  card?: ProductCardAccessory | undefined;
  ribbonDetail?: ProductRibbonAccessory | undefined;
  otherAccessories?: ProductDecorAccessory[] | undefined;
}

export interface ProductInferredContext {
  likelyOccasions: string[];
  likelyAudience: string;
  suggestedPrice: number;
  confidence: number;
}

export interface ProductTrendFitItem {
  attribute: string;
  productValue: string;
  marketSignal: string;
  matchStatus: "MATCH" | "PARTIAL" | "MISMATCH";
  lifecycle: TrendLifecycle;
  note: string;
}

export interface ProductImprovement {
  keep: string[];
  improve: string[];
  test: string[];
}

export type TopicAngleCategory =
  | "EMOTIONAL"
  | "PROBLEM_SOLUTION"
  | "PRODUCT_SHOWCASE"
  | "EDUCATIONAL"
  | "TREND"
  | "PRICE_VALUE";

export interface ConcreteTopic {
  id: string;
  title: string;
  angleCategory: TopicAngleCategory;
  hook: string;
  format: "REELS_TIKTOK_9_16" | "CAROUSEL_PHOTO_1_1" | "STORY_DAILY";
  cta: string;
  evidenceNote: string;
  referenceUrl?: string;
  platform?: "tiktok" | "youtube" | "google" | "facebook";
  dualVideoEvidence?: {
    youtube: {
      thumbnailUrl: string;
      videoUrl: string;
      title: string;
      author: string;
      metrics: string;
      alt?: string | undefined;
      /** `false` = danh mục tham khảo tuyển chọn (metrics ƯỚC TÍNH, TikTok là
       *  trang tìm kiếm) — giao diện PHẢI gắn nhãn, không trình bày như số thật. */
      isLiveEvidence?: boolean | undefined;
    };
    tiktok: {
      thumbnailUrl: string;
      videoUrl: string;
      title: string;
      author: string;
      metrics: string;
      alt?: string | undefined;
      /** `false` = danh mục tham khảo tuyển chọn (metrics ƯỚC TÍNH, TikTok là
       *  trang tìm kiếm) — giao diện PHẢI gắn nhãn, không trình bày như số thật. */
      isLiveEvidence?: boolean | undefined;
    };
  } | undefined;
}

export interface ProductContentReadiness {
  productRecognition: boolean;
  trendFit: boolean;
  audienceDefined: boolean;
  positioningDefined: boolean;
  visualQuality: "EXCELLENT" | "ACCEPTABLE" | "NEEDS_IMPROVEMENT";
  videoPotential: boolean;
}

export interface CommercialPassport {
  suggestedName: string;
  shortHeadline: string;
  description: string;
  style: string;
  tags: string[];
  seoKeywords: string[];
  occasions: string[];
  targetAudience: {
    recipient: string;
    buyerPersona: string;
  };
  flowerMeaningStory: string;
  keySellingPoints: string[];
  cardMessageSuggestions: {
    romantic: string;
    subtle: string;
    congratulatory: string;
  };
  careInstructions: string[];
  priceSegment: "budget" | "standard" | "premium" | "luxury";
  priceRange: {
    minPrice: number;
    targetPrice: number;
    maxPrice: number;
  };
  recommendedUpsells: string[];
}

export interface ProductIntelligenceReport {
  id: string;
  productName: string;
  imageUrl: string;
  trendFitScore: number;
  audienceFitScore: number;
  contentFitScore: number;
  overallFit: "HIGH" | "MEDIUM" | "LOW";
  components: ProductFlowerComponent[];
  attributes: ProductVisualAttributes;
  packaging: ProductPackaging;
  context: ProductInferredContext;
  commercialPassport?: CommercialPassport;
  trendFitMatrix: ProductTrendFitItem[];
  improvements: ProductImprovement;
  topics: ConcreteTopic[];
  readiness: ProductContentReadiness;
  createdAt: string;
}
