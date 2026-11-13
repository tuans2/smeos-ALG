/**
 * Hợp đồng dữ liệu Product Intelligence dùng chung cho Chặng 02–04.
 * Phản chiếu `market-intelligence/domain/product-intelligence-types.ts`;
 * `conformance.ts` khoá hai bên khớp nhau ở tầng kiểu (tsc).
 */

import { z } from "zod"

export const productFlowerComponentSchema = z.object({
  id: z.string().optional(),
  flowerType: z.string().describe("Tên hoa/lá, vd. Hoa hồng đỏ"),
  quantityEstimate: z.number().describe("Số lượng ước tính"),
  unit: z.string().describe("Đơn vị, vd. bông, cành"),
  role: z.enum(["dominant", "supporting", "foliage"]).describe("Vai trò; lá/cành đệm là foliage"),
  color: z.string().optional(),
})

export const productVisualAttributesSchema = z.object({
  mainColors: z.array(z.string()),
  secondaryColors: z.array(z.string()),
  style: z.string(),
  shape: z.string(),
  sizeEstimate: z.string(),
})

export const productPackagingSchema = z.object({
  wrappingMaterial: z.string(),
  wrappingColor: z.string(),
  ribbon: z.string(),
  accessories: z.array(z.string()),
  card: z
    .object({
      hasCard: z.boolean(),
      cardType: z
        .enum(["Thiệp gập thiết kế", "Tag cắm mini", "Biển mica nghệ thuật", "Banner dải băng chữ", "Khác"])
        .optional(),
      printedText: z.string().optional().describe("Chữ in/viết bóc tách qua OCR"),
      color: z.string().optional(),
    })
    .optional(),
  ribbonDetail: z
    .object({
      ribbonColor: z.string().optional(),
      ribbonMaterial: z.string().optional(),
      bowStyle: z.string().optional(),
    })
    .optional(),
  otherAccessories: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        quantity: z.number(),
        unit: z.string(),
        color: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .optional(),
})

export const productInferredContextSchema = z.object({
  likelyOccasions: z.array(z.string()),
  likelyAudience: z.string(),
  suggestedPrice: z.number(),
  confidence: z.number(),
})

export const commercialPassportSchema = z.object({
  suggestedName: z.string(),
  shortHeadline: z.string(),
  description: z.string(),
  style: z.string(),
  tags: z.array(z.string()),
  seoKeywords: z.array(z.string()),
  occasions: z.array(z.string()),
  targetAudience: z.object({ recipient: z.string(), buyerPersona: z.string() }),
  flowerMeaningStory: z.string(),
  keySellingPoints: z.array(z.string()),
  cardMessageSuggestions: z.object({ romantic: z.string(), subtle: z.string(), congratulatory: z.string() }),
  careInstructions: z.array(z.string()),
  priceSegment: z.enum(["budget", "standard", "premium", "luxury"]),
  priceRange: z.object({ minPrice: z.number(), targetPrice: z.number(), maxPrice: z.number() }),
  recommendedUpsells: z.array(z.string()),
})

export const trendLifecycleSchema = z.enum(["EMERGING", "GROWING", "PEAK", "STABLE", "DECLINING"])

const videoEvidenceSchema = z.object({
  thumbnailUrl: z.string(),
  videoUrl: z.string(),
  title: z.string(),
  author: z.string(),
  metrics: z.string(),
  alt: z.string().optional(),
  isLiveEvidence: z
    .boolean()
    .optional()
    .describe("false = danh mục tham khảo (metrics ƯỚC TÍNH) — giao diện phải gắn nhãn"),
})

export const concreteTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  angleCategory: z.enum(["EMOTIONAL", "PROBLEM_SOLUTION", "PRODUCT_SHOWCASE", "EDUCATIONAL", "TREND", "PRICE_VALUE"]),
  hook: z.string(),
  format: z.enum(["REELS_TIKTOK_9_16", "CAROUSEL_PHOTO_1_1", "STORY_DAILY"]),
  cta: z.string(),
  evidenceNote: z.string(),
  referenceUrl: z.string().optional(),
  platform: z.enum(["tiktok", "youtube", "google", "facebook"]).optional(),
  dualVideoEvidence: z.object({ youtube: videoEvidenceSchema, tiktok: videoEvidenceSchema }).optional(),
})

export const productIntelligenceReportSchema = z.object({
  id: z.string().describe("product_analysis_runs.id"),
  productName: z.string(),
  imageUrl: z.string(),
  trendFitScore: z.number().min(0).max(100),
  audienceFitScore: z.number().min(0).max(100),
  contentFitScore: z.number().min(0).max(100),
  overallFit: z.enum(["HIGH", "MEDIUM", "LOW"]),
  components: z.array(productFlowerComponentSchema),
  attributes: productVisualAttributesSchema,
  packaging: productPackagingSchema,
  context: productInferredContextSchema,
  commercialPassport: commercialPassportSchema.optional(),
  trendFitMatrix: z.array(
    z.object({
      attribute: z.string(),
      productValue: z.string(),
      marketSignal: z.string(),
      matchStatus: z.enum(["MATCH", "PARTIAL", "MISMATCH"]),
      lifecycle: trendLifecycleSchema,
      note: z.string(),
    })
  ),
  improvements: z.object({ keep: z.array(z.string()), improve: z.array(z.string()), test: z.array(z.string()) }),
  topics: z.array(concreteTopicSchema).describe("10 chủ đề của Chặng 04 IDEATE"),
  readiness: z.object({
    productRecognition: z.boolean(),
    trendFit: z.boolean(),
    audienceDefined: z.boolean(),
    positioningDefined: z.boolean(),
    visualQuality: z.enum(["EXCELLENT", "ACCEPTABLE", "NEEDS_IMPROVEMENT"]),
    videoPotential: z.boolean(),
  }),
  createdAt: z.string(),
})
