import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { generateContentBodySchema, generationLookupQuerySchema } from "@/modules/content-engine/contracts/generation"
import { generateContent } from "@/modules/content-engine/use-cases/generate-content"
import { findLatestContentGeneration } from "@/modules/content-engine/use-cases/get-content-generation"
import type { content_generations } from "@/modules/content-engine/infra/content-generation-repository"
import { defineRoute } from "@/core/http/define-route"

function generationJson(g: content_generations) {
  return {
    id: g.id,
    job_id: g.job_id,
    origin: g.origin,
    status: g.status,
    asset_id: g.asset_id,
    product_id: g.product_id,
    topic_id: g.topic_id,
    scene_plan_id: g.scene_plan_id,
    mode: g.mode,
    channels: g.channels,
    posts: g.posts,
    approved_posts: g.approved_posts,
    overall_score: g.overall_score,
    rubric_version: g.rubric_version,
    prompt_versions: g.prompt_versions,
    created_at: g.created_at,
  }
}

/**
 * `POST /api/v1/content-engine/generations` — chuỗi agent viết bài đa kênh
 * (P27, `I1`, feature `content.generate`, header `Idempotency-Key` bắt
 * buộc). Trùng khoá thì trả lại bản ghi cũ, không trừ credit lần hai.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) throw validationFailed({ "Idempotency-Key": "Bắt buộc (YC-U7)" })

    const parsed = generateContentBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data

    const result = await generateContent(ctx, {
      idempotencyKey,
      assetId: d.asset_id ?? null,
      productId: d.product_id ?? null,
      analysisRunId: d.analysis_run_id ?? null,
      topicId: d.topic_id ?? null,
      scenePlanId: d.scene_plan_id ?? null,
      channels: d.channels,
      contentProvider: d.content_provider ?? null,
    })

    return jsonResponse(
      {
        job_id: result.jobId,
        generation_id: result.generationId,
        status: result.status,
        posts: result.posts,
        overall_score: result.overallScore,
        needs_review: result.needsReview,
        deduped: result.deduped,
        usage: { cost_credit: result.usage.costCredit, balance_after: result.usage.balanceAfter },
      },
      // Trùng khoá lúc lượt đầu còn chạy: 202 + `job_id` để theo dõi `GET /jobs/:id`.
      { status: !result.deduped ? 201 : result.status === "PROCESSING" ? 202 : 200 }
    )
  },
})

/**
 * `GET /api/v1/content-engine/generations?asset_id&topic_id&mode` — tra bản
 * mới nhất khớp bộ lọc, KHÔNG tạo job, không trừ credit. Chưa có thì
 * `{ generation: null }`.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    // Tham số vắng mặt phải là "bỏ qua điều kiện này" chứ không phải "lọc theo
    // NULL" — URLSearchParams.get() trả `null` khi thiếu, phải đổi về
    // `undefined` trước khi đưa vào schema.
    const parsed = generationLookupQuerySchema.safeParse({
      asset_id: url.searchParams.get("asset_id") ?? undefined,
      topic_id: url.searchParams.get("topic_id") ?? undefined,
      scene_plan_id: url.searchParams.get("scene_plan_id") ?? undefined,
      mode: url.searchParams.get("mode") ?? undefined,
    })
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data

    const found = await findLatestContentGeneration(ctx, {
      ...(d.asset_id !== undefined ? { assetId: d.asset_id } : {}),
      ...(d.topic_id !== undefined ? { topicId: d.topic_id } : {}),
      ...(d.scene_plan_id !== undefined ? { scenePlanId: d.scene_plan_id } : {}),
      ...(d.mode !== undefined ? { mode: d.mode } : {}),
    })
    return jsonResponse({ generation: found ? generationJson(found) : null })
  },
})
