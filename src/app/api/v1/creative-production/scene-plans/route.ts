import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import {
  findScenePlanByKey,
  generateScenePlan,
} from "@/modules/creative-production/use-cases/generate-scene-plan"
import { scenePlanKey } from "@/modules/creative-production/domain/scene-plan-rules"
import { scenePlanBodySchema } from "@/modules/creative-production/contracts/stage-05-choose"
import { scenePlanLookupQuery } from "@/app/api/v1/_contracts/requests-creative"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 05 — nguồn chuẩn ở `contracts/stage-05-choose.ts`. */
const postSchema = scenePlanBodySchema

/**
 * `POST /api/v1/creative-production/scene-plans` — AI viết kịch bản bối cảnh
 * cho một chủ đề (`I1`, feature `creative.scene_plan`, header
 * `Idempotency-Key` bắt buộc). Trùng khoá thì trả kịch bản cũ, không trừ credit.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) throw validationFailed({ "Idempotency-Key": "Bắt buộc (YC-U7)" })

    const parsed = postSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data

    const result = await generateScenePlan(ctx, {
      idempotencyKey,
      productId: d.product_id ?? null,
      assetId: d.asset_id ?? null,
      contentProvider: d.content_provider ?? null,
      brief: {
        mode: d.mode,
        productName: d.product.name,
        category: d.product.category,
        style: d.product.style,
        colors: d.product.colors,
        components: d.product.components,
        occasions: d.product.occasions,
        targetAudience: d.product.target_audience,
        priceRange: d.product.price_range,
        platforms: d.platforms,
        outputs: d.outputs,
        topic: {
          id: d.topic.id,
          title: d.topic.title,
          angleCategory: d.topic.angle_category,
          hook: d.topic.hook,
          cta: d.topic.cta,
          format: d.topic.format,
        },
      },
    })

    return jsonResponse(
      {
        job_id: result.jobId,
        status: result.status,
        error: result.error,
        plan: result.plan,
        deduped: result.deduped,
        usage: { cost_credit: result.usage.costCredit, balance_after: result.usage.balanceAfter },
      },
      { status: result.deduped ? 200 : 201 }
    )
  },
})

/**
 * `GET /api/v1/creative-production/scene-plans?asset_id&topic_id&mode` — tra
 * kịch bản đã có của đúng ảnh + chủ đề + mode, KHÔNG tạo job, không trừ credit.
 * Chưa có thì `{ plan: null }`.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const parsed = scenePlanLookupQuery.safeParse({
      asset_id: url.searchParams.get("asset_id"),
      topic_id: url.searchParams.get("topic_id"),
      mode: url.searchParams.get("mode"),
    })
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const found = await findScenePlanByKey(
      ctx,
      scenePlanKey({ assetId: parsed.data.asset_id, topicId: parsed.data.topic_id, mode: parsed.data.mode })
    )
    return jsonResponse(
      found
        ? { job_id: found.jobId, status: found.status, error: found.error, plan: found.plan }
        : { job_id: null, status: null, error: null, plan: null }
    )
  },
})
