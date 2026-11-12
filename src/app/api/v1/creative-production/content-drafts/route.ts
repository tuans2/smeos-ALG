import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getContentDraft, saveContentDraft } from "@/modules/creative-production/use-cases/content-draft"

import {
  contentDraftBodySchema,
  contentDraftKeySchema,
} from "@/modules/creative-production/contracts/stage-06a-content"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 06a — nguồn chuẩn ở `contracts/stage-06a-content.ts`. */
const keySchema = contentDraftKeySchema

/**
 * `GET /api/v1/creative-production/content-drafts?asset_id&topic_id&mode` (`I1`)
 * — bài Khu vực B đã tự lưu cho đúng ảnh + chủ đề + mode; chưa có thì `{ draft: null }`.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const parsed = keySchema.safeParse({
      asset_id: url.searchParams.get("asset_id"),
      topic_id: url.searchParams.get("topic_id"),
      mode: url.searchParams.get("mode"),
    })
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data
    return jsonResponse({ draft: await getContentDraft(ctx, { assetId: d.asset_id, topicId: d.topic_id, mode: d.mode }) })
  },
})

const putSchema = contentDraftBodySchema

/** `PUT /api/v1/creative-production/content-drafts` (`I1`) — tự lưu bài Khu vực B (ghi đè bản cũ cùng khoá). */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const parsed = putSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data
    const draft = await saveContentDraft(
      ctx,
      { assetId: d.asset_id, topicId: d.topic_id, mode: d.mode },
      { posts: d.posts, topicTitle: d.topic_title ?? null }
    )
    return jsonResponse({ draft })
  },
})
