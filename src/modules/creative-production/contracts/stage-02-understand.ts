/** Chặng 02 — UNDERSTAND: Vision AI bóc tách cấu trúc sản phẩm từ ảnh đã lưu kho. */

import { z } from "zod"

import { defineStage } from "./define-stage"
import {
  productFlowerComponentSchema,
  productInferredContextSchema,
  productPackagingSchema,
  productVisualAttributesSchema,
} from "./product-intelligence"
import {
  EXAMPLE_ASSET_ID,
  exampleAttributes,
  exampleComponents,
  exampleContext,
  examplePackaging,
} from "./examples-shared"

export const visionExtractBodySchema = z.object({
  image_url: z.string().optional().describe("BỎ QUA từ 25/09/2026 — máy chủ đọc ảnh từ kho theo asset_id; giữ để client cũ không vỡ"),
  asset_id: z.string().min(1).describe("Ảnh đã lưu kho của đúng tổ chức (bắt buộc từ 25/09/2026)"),
  product_title: z.string().optional(),
  reanalyze_key: z
    .string()
    .min(8)
    .max(64)
    .optional()
    .describe("Người dùng xác nhận phân tích LẠI ảnh đã có kết quả: bỏ kết quả cũ, gọi mô hình mới và thu credit; cùng khoá = cùng một lần bấm (chống trừ hai lần)"),
})

export const visionExtractResultSchema = z.object({
  productName: z.string(),
  imageUrl: z.string(),
  assetId: z.string().optional(),
  reused: z.boolean().optional().describe("true = kết quả cũ của chính ảnh này (không gọi mô hình, không thu credit)"),
  components: z.array(productFlowerComponentSchema).describe("Hoa + lá đệm (role foliage) — không có mảng riêng"),
  attributes: productVisualAttributesSchema,
  packaging: productPackagingSchema,
  context: productInferredContextSchema,
  source: z.enum(["vision_ai", "m01"]).optional().describe("vision_ai = mô hình vừa đọc ảnh (thu credit) · m01 = kết quả M01 đã lưu (miễn phí)"),
  usage: z.object({ cost_credit: z.number().int(), balance_after: z.number().int().nullable() }).optional(),
})

export const stage02Understand = defineStage({
  id: "02",
  stage: 2,
  code: "UNDERSTAND",
  slug: "understand",
  title: "Chặng 02 — UNDERSTAND: Nhận diện cấu trúc & định tính thương mại",
  summary: "Mô hình thị giác (gpt-4o-mini) đọc ảnh TỪ KHO theo asset_id, trả thành phần hoa, thuộc tính thị giác, bao bì, bối cảnh; người dùng sửa được từng trường. Thu product.vision_extract (1 credit) khi mô hình chạy; cùng ảnh bấm lại không thu lần hai; hỏng thì hoàn.",
  endpoint: { method: "POST", path: "/api/v1/market-intelligence/vision-extract", capability: "V1" },
  input: visionExtractBodySchema,
  output: visionExtractResultSchema,
  examples: {
    input: { asset_id: EXAMPLE_ASSET_ID, product_title: "Bó hồng đỏ 12 bông" },
    output: {
      productName: "Bó hồng đỏ 12 bông",
      imageUrl: "https://storage.example/signed/3f1c9a52.jpg",
      assetId: EXAMPLE_ASSET_ID,
      components: exampleComponents,
      attributes: exampleAttributes,
      packaging: examplePackaging,
      context: exampleContext,
    },
  },
})
