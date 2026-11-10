import { z } from "zod"

export { productIntelligenceReportSchema as productIntelligenceResponse } from "@/modules/creative-production/contracts/product-intelligence"
export { visionExtractResultSchema as visionExtractResponse } from "@/modules/creative-production/contracts/stage-02-understand"

/**
 * Phản hồi `/api/v1/content-engine/*` và `/api/v1/market-intelligence/*` (OpenAPI nội bộ, PO 07/11/2026). Đọc ảnh và
 * phân tích sản phẩm là hợp đồng Chặng 02/03 của Creative Studio (nguồn chuẩn, xuất lại). Phần còn lại sinh từ kiểu TS
 * của `content-engine` (landing-content-generator, catalog-content-generator) và dòng `content_generations` /
 * `research_runs`, đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở `tests/tenant/internal-contract-content.test.ts`.
 * `brief`, `strategy`, `posts` của bài đa kênh là đầu ra chuỗi agent (khai đối tượng tự do).
 */
const timestamp = z.iso.datetime()
const json = z.unknown()
const post = z.record(z.string(), z.unknown())

const generationBase = {
  id: z.string(),
  job_id: z.string().nullable(),
  origin: z.string(),
  status: z.string(),
  asset_id: z.string().nullable(),
  product_id: z.string().nullable(),
  topic_id: z.string().nullable(),
  scene_plan_id: z.string().nullable(),
  mode: z.string().nullable(),
  channels: z.array(z.string()),
  posts: z.array(post),
  approved_posts: z.array(post).nullable(),
  overall_score: z.number().nullable(),
  rubric_version: z.string().nullable(),
  prompt_versions: json,
  created_at: timestamp,
}
export const generationResponse = z.strictObject({ ...generationBase, brief: json, strategy: json, brief_version: z.number().nullable() })
/** Chưa có bản khớp bộ lọc → `generation: null`; không tạo job, không trừ credit. */
export const generationLookupResponse = z.strictObject({ generation: z.strictObject(generationBase).nullable() })
export const generationApprovedResponse = z.strictObject({
  id: z.string(),
  status: z.string(),
  approved_by: z.string().nullable(),
  approved_posts: z.array(post).nullable(),
  updated_at: timestamp,
})
/** 201 tạo mới; trùng `Idempotency-Key` → 200 bản cũ (`deduped: true`), hoặc 202 khi lượt đầu còn chạy. */
export const generationCreatedResponse = z.strictObject({
  job_id: z.string(),
  generation_id: z.string(),
  status: z.string(),
  posts: z.array(post),
  overall_score: z.number().nullable(),
  needs_review: z.boolean(),
  deduped: z.boolean(),
  usage: z.strictObject({ cost_credit: z.number(), balance_after: z.number().nullable() }),
})

export const landingContentResponse = z.strictObject({
  data: z.strictObject({
    hero: z.strictObject({ badge: z.string(), headline: z.string(), subHeadline: z.string(), countdownLabel: z.string() }),
    story: z.strictObject({ title: z.string(), paragraphs: z.array(z.string()), quote: z.string(), floristName: z.string() }),
    perks: z.array(z.strictObject({ id: z.string(), title: z.string(), description: z.string(), icon: z.enum(["camera", "clock", "shield", "gift"]) })),
    steps: z.array(z.strictObject({ step: z.number(), title: z.string(), description: z.string() })),
    faq: z.array(z.strictObject({ question: z.string(), answer: z.string() })),
    lead: z.strictObject({ tag: z.string(), title: z.string(), description: z.string(), discountBadge: z.string(), urgencyNotice: z.string() }),
    /** Bản đã lưu vào Kho dữ liệu; `null` khi lưu hỏng (không chặn kết quả). */
    landing_page_id: z.string().nullable(),
  }),
})
export const catalogContentResponse = z.strictObject({
  data: z.strictObject({
    styleVariant: z.enum(["EDITORIAL_LOOKBOOK", "MODERN_SHOWROOM", "COMPACT_LIST"]),
    badge: z.string(),
    title: z.string(),
    description: z.string(),
    curatorNote: z.string(),
    ctaText: z.string(),
  }),
})
/** Envelope cũ `{ success: true, … }`. `fallback: true` = gợi ý dựng sẵn khi AI không trả được — không tính credit. */
export const rewriteResponse = z.strictObject({ success: z.literal(true), suggestions: z.array(z.string()), fallback: z.boolean().optional() })

/** Mục cơ hội nội dung — chưa có mẫu thật trong test hợp đồng (bảng trống), nên khai đối tượng tự do. */
export const opportunitiesResponse = z.strictObject({ items: z.array(z.record(z.string(), z.unknown())), nextCursor: z.string().nullable(), total: z.number() })
const RUN_TYPE = z.enum(["DAILY_DEEP", "INTRADAY_PULSE", "WEEKLY_DEEP", "MANUAL"])
export const researchRunResponse = z.strictObject({ runId: z.string(), status: z.string(), runType: RUN_TYPE, createdAt: timestamp })
export const researchRunsResponse = z.strictObject({
  items: z.array(
    z.strictObject({
      id: z.string(),
      run_type: RUN_TYPE,
      status: z.string(),
      started_at: timestamp.nullable(),
      completed_at: timestamp.nullable(),
      sources_attempted: z.number(),
      sources_succeeded: z.number(),
      sources_failed: z.number(),
      records_collected: z.number(),
      topics_created: z.number(),
      opportunities_created: z.number(),
      error_summary: z.string().nullable(),
      created_at: timestamp,
      updated_at: timestamp,
    })
  ),
})
/** Dòng `provider_health` — dữ liệu chung toàn nền tảng. */
export const providerHealthResponse = z.strictObject({ providers: z.array(z.record(z.string(), z.unknown())) })
