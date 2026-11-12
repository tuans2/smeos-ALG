import { jsonResponse } from "@/core/http/response"
import { getContentGenerationById } from "@/modules/content-engine/use-cases/get-content-generation"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/content-engine/generations/:id` (`I1`). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const g = await getContentGenerationById(ctx, id)
    return jsonResponse({
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
      brief: g.brief,
      strategy: g.strategy,
      posts: g.posts,
      approved_posts: g.approved_posts,
      overall_score: g.overall_score,
      rubric_version: g.rubric_version,
      prompt_versions: g.prompt_versions,
      brief_version: g.brief_version,
      created_at: g.created_at,
    })
  },
})
