import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import {
  createCampaignPackage,
  listCampaignPackages,
} from "@/modules/creative-production/use-cases/manage-campaign-package"
import { createPackageBodySchema } from "@/modules/creative-production/contracts/stage-07-package"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 07 — nguồn chuẩn ở `contracts/stage-07-package.ts`. */
const postSchema = createPackageBodySchema

/**
 * `POST /api/v1/creative-production/packages` (`I1`) — Chặng 07: tạo gói chiến
 * dịch (DRAFT) neo vào Master Image đã duyệt. `organization_id` chỉ từ phiên.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const parsed = postSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data
    const result = await createCampaignPackage(ctx, {
      name: d.name,
      mode: d.mode,
      masterAssetId: d.master_asset_id,
      topic: d.topic,
      posts: d.posts,
      variantAssetIds: d.variant_asset_ids,
      videoJobId: d.video_job_id ?? null,
      videoJobIds: d.video_job_ids,
      audioJobId: d.audio_job_id ?? null,
    })
    return jsonResponse(result, { status: 201 })
  },
})

/** `GET /api/v1/creative-production/packages?master_asset_id=` (`G1`). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) throw validationFailed({ limit: "Phải là số nguyên" })
    return jsonResponse(
      await listCampaignPackages(ctx, {
        masterAssetId: url.searchParams.get("master_asset_id") ?? undefined,
        limit,
      })
    )
  },
})
