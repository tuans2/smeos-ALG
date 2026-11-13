/**
 * Chặng 05 — CHOOSE: chủ tiệm chọn chủ đề + mode + nền tảng; AI viết kịch bản
 * sản xuất tổng (`creative.scene_plan`, AIC-18) dùng chung cho Khu vực B/C/D/E.
 * Hợp đồng phụ `handoff`: query bàn giao sang `/creative-studio` (chỉ định danh).
 */

import { z } from "zod"

import { buildRuleScenePlan } from "../domain/scene-plan-rules"
import { MAX_HANDOFF_QUERY_LENGTH } from "../domain/build-handoff-url"
import { PRODUCTION_OUTPUTS, PUBLISH_PLATFORMS } from "../domain/publishing-rules"
import { defineStage } from "./define-stage"
import { productionModeSchema } from "./common"
import { scenePlanCreateResultSchema } from "./scene-plan"
import { toExample } from "./deep-mutable"
import { EXAMPLE_ASSET_ID, EXAMPLE_JOB_ID, EXAMPLE_PRODUCT_ID, EXAMPLE_RUN_ID, exampleTopic } from "./examples-shared"

const str = (max: number) => z.string().trim().max(max)
const list = z.array(str(60)).max(12)

/** Phạm vi nền tảng (PO 24/09/2026): `"all"` = tất cả, mảng rỗng cũng là tất cả. */
export const publishPlatformsScopeSchema = z.union([z.literal("all"), z.array(z.enum(PUBLISH_PLATFORMS)).max(8)])
/** Phạm vi loại kết quả: `"all"` = content + audio + image + video. */
export const productionOutputsScopeSchema = z.union([z.literal("all"), z.array(z.enum(PRODUCTION_OUTPUTS)).max(4)])

/** Thân `POST /creative-production/scene-plans` (header `Idempotency-Key` bắt buộc). */
export const scenePlanBodySchema = z.object({
  mode: productionModeSchema,
  content_provider: z.string().min(1).max(40).optional().describe("Nhà cung cấp nội dung cho lượt này (claude_opus | openai_structured | gemini_pro | claude_sonnet | gemini_flash | openai_direct); bỏ trống = thứ tự ưu tiên của tiệm"),
  asset_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  product: z.object({
    name: str(160).min(1),
    category: str(80).optional(),
    style: str(120).optional(),
    colors: list.default([]),
    components: list.default([]),
    occasions: list.default([]),
    target_audience: str(200).optional(),
    price_range: str(80).optional(),
  }),
  platforms: publishPlatformsScopeSchema
    .optional()
    .describe("Nền tảng đăng — quyết định tỉ lệ + khuôn video; bỏ trống = TikTok + Reels (9:16); \"all\" = mọi nền tảng"),
  outputs: productionOutputsScopeSchema
    .optional()
    .describe("Loại kết quả sản xuất (content/audio/image/video); bỏ trống hoặc \"all\" = cả 4; video kéo theo image + audio"),
  topic: z.object({
    id: str(120).min(1),
    title: str(200).min(1),
    angle_category: str(40).optional(),
    hook: str(300).optional(),
    cta: str(200).optional(),
    format: str(40).optional(),
  }),
})

/**
 * Query bàn giao Chặng 05 → `/creative-studio` (`buildHandoffSearchParams`).
 * CẤM mang ảnh (Data URL/blob) — tổng query ≤ MAX_HANDOFF_QUERY_LENGTH ký tự.
 */
export const handoffQuerySchema = z
  .object({
    topic: z.string().min(1).describe("report.id (lượt phân tích) hoặc id topic"),
    selectedTopic: z.string().optional().describe("ConcreteTopic.id đã chọn"),
    mode: productionModeSchema,
    source: z.enum(["image", "video", "both"]),
    assetId: z.string().min(1).describe("BẮT BUỘC — ảnh đã lưu kho"),
    area: z.enum(["a", "b", "c", "d", "e", "f"]),
    productName: z.string().optional(),
    productId: z.string().optional(),
    audioJobId: z.string().optional().describe("Ghi thêm bởi Khu vực C"),
    videoJobId: z.string().optional().describe("Ghi thêm bởi Khu vực E"),
    platforms: z
      .string()
      .max(200)
      .optional()
      .describe("Phạm vi nền tảng chọn cuối Chặng 04: danh sách cách nhau dấu phẩy hoặc \"all\"; bỏ trống = TikTok + Reels"),
    outputs: z
      .string()
      .max(60)
      .optional()
      .describe("Loại kết quả: content,audio,image,video hoặc \"all\"; bỏ trống = tất cả"),
  })
  .describe(`Query string của /creative-studio; tổng độ dài ≤ ${MAX_HANDOFF_QUERY_LENGTH} ký tự`)

const examplePlan = toExample(
  buildRuleScenePlan({
    mode: "AUTHENTIC",
    productName: "Bó hồng đỏ 12 bông",
    colors: ["đỏ", "trắng"],
    components: ["Hoa hồng đỏ", "Baby trắng"],
    occasions: ["Sinh nhật"],
    topic: { id: exampleTopic.id, title: exampleTopic.title, angleCategory: "EMOTIONAL", hook: exampleTopic.hook, cta: exampleTopic.cta },
  })
)

export const stage05Choose = defineStage({
  id: "05",
  stage: 5,
  code: "CHOOSE",
  slug: "choose",
  title: "Chặng 05 — CHOOSE: Chọn định hướng & kịch bản sản xuất tổng",
  summary:
    "Chủ tiệm chọn chủ đề, mode (CREATIVE 5 cảnh / AUTHENTIC 3 cảnh) và nền tảng; AI viết ScenePlan v2 qua job. Trùng Idempotency-Key trả kịch bản cũ, không trừ credit.",
  endpoint: { method: "POST", path: "/api/v1/creative-production/scene-plans", capability: "I1", idempotencyKey: true },
  input: scenePlanBodySchema,
  output: scenePlanCreateResultSchema,
  examples: {
    input: {
      mode: "AUTHENTIC",
      asset_id: EXAMPLE_ASSET_ID,
      product_id: EXAMPLE_PRODUCT_ID,
      product: { name: "Bó hồng đỏ 12 bông", colors: ["đỏ", "trắng"], components: ["Hoa hồng đỏ", "Baby trắng"], occasions: ["Sinh nhật"] },
      platforms: ["tiktok", "instagram_reels"],
      outputs: "all",
      topic: { id: exampleTopic.id, title: exampleTopic.title, angle_category: "EMOTIONAL", hook: exampleTopic.hook, cta: exampleTopic.cta },
    },
    output: {
      job_id: EXAMPLE_JOB_ID,
      status: "COMPLETED",
      error: null,
      plan: examplePlan,
      deduped: false,
      usage: { cost_credit: 1, balance_after: 249 },
    },
  },
  extras: {
    handoff: {
      schema: handoffQuerySchema,
      example: {
        topic: EXAMPLE_RUN_ID,
        selectedTopic: exampleTopic.id,
        mode: "AUTHENTIC",
        source: "image",
        assetId: EXAMPLE_ASSET_ID,
        area: "a",
        productName: "Bó hồng đỏ 12 bông",
        platforms: "tiktok,instagram_reels",
        outputs: "all",
      },
    },
  },
})
