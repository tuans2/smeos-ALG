import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import {
  getCampaignPackage,
  updateCampaignPackage,
} from "@/modules/creative-production/use-cases/manage-campaign-package"
import { patchPackageBody } from "@/app/api/v1/_contracts/requests-creative"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

/** `GET /api/v1/creative-production/packages/:id` (`G1`). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await getCampaignPackage(ctx, id))
  },
})

/**
 * `PATCH /api/v1/creative-production/packages/:id` (`I1`) — sửa gói chưa duyệt.
 * Sửa bất kỳ trường nào đưa gói về DRAFT: kết quả QA cũ không còn giá trị.
 */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = patchPackageBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data
    return jsonResponse(
      await updateCampaignPackage(ctx, id, {
        name: d.name,
        posts: d.posts,
        variantAssetIds: d.variant_asset_ids,
        videoJobId: d.video_job_id,
        videoJobIds: d.video_job_ids,
        audioJobId: d.audio_job_id,
      })
    )
  },
})
