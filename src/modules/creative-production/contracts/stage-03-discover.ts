/** Chặng 03 — DISCOVER: đối soát sản phẩm với xu hướng thị trường (lưu `product_analysis_runs`). */

import { z } from "zod"

import { defineStage } from "./define-stage"
import {
  commercialPassportSchema,
  productFlowerComponentSchema,
  productInferredContextSchema,
  productIntelligenceReportSchema,
  productPackagingSchema,
  productVisualAttributesSchema,
} from "./product-intelligence"
import {
  EXAMPLE_ASSET_ID,
  exampleAttributes,
  exampleComponents,
  exampleContext,
  examplePackaging,
  exampleReport,
} from "./examples-shared"

export const productIntelligenceBodySchema = z.object({
  product_name: z.string().optional(),
  image_url: z.string().optional(),
  asset_id: z
    .string()
    .min(1, "Thiếu asset_id — ảnh chưa được lưu vào kho ảnh")
    .describe("BẮT BUỘC từ 22/09/2026 (nợ #118)"),
  components: z.array(productFlowerComponentSchema).optional().describe("Đầu ra Chặng 02 (đã sửa)"),
  attributes: z.union([productVisualAttributesSchema, z.array(productVisualAttributesSchema)]).optional(),
  packaging: productPackagingSchema.optional(),
  context: productInferredContextSchema.optional(),
  commercial_passport: commercialPassportSchema.nullish(),
})

export const stage03Discover = defineStage({
  id: "03",
  stage: 3,
  code: "DISCOVER",
  slug: "discover",
  title: "Chặng 03 — DISCOVER: Nghiên cứu xu hướng & cơ hội thị trường",
  summary:
    "Một lượt gọi trả ProductIntelligenceReport: điểm phù hợp, ma trận xu hướng, KEEP/IMPROVE/TEST — và luôn cả 10 chủ đề của Chặng 04.",
  endpoint: { method: "POST", path: "/api/v1/market-intelligence/product-intelligence", capability: "V1" },
  input: productIntelligenceBodySchema,
  output: productIntelligenceReportSchema,
  examples: {
    input: {
      product_name: "Bó hồng đỏ 12 bông",
      asset_id: EXAMPLE_ASSET_ID,
      components: exampleComponents,
      attributes: exampleAttributes,
      packaging: examplePackaging,
      context: exampleContext,
    },
    output: exampleReport,
  },
})
