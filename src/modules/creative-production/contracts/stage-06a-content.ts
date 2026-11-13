/** Chặng 06a — CREATE / Khu vực B: bài đăng theo kênh, tự lưu (`content_drafts`). */

import { z } from "zod"

import { defineStage } from "./define-stage"
import { isoDateTimeSchema, packagePostSchema, packagePostsSchema, productionModeSchema } from "./common"
import { EXAMPLE_ASSET_ID, EXAMPLE_NOW, exampleTopic } from "./examples-shared"

/** Khoá một bản nháp: đúng ảnh + chủ đề + mode. */
export const contentDraftKeySchema = z.object({
  asset_id: z.string().uuid(),
  topic_id: z.string().trim().min(1).max(200),
  mode: productionModeSchema,
})

export const contentDraftBodySchema = contentDraftKeySchema.extend({
  topic_title: z.string().max(500).nullish(),
  posts: packagePostsSchema,
})

export const contentDraftSchema = z.object({
  asset_id: z.string(),
  topic_id: z.string(),
  mode: z.string(),
  topic_title: z.string().nullable(),
  posts: z.array(packagePostSchema),
  updated_at: isoDateTimeSchema,
})

const posts = [
  {
    channel: "facebook" as const,
    text: "12 bông hồng đỏ — mỗi bông cho một tháng bên nhau. Nhắn tiệm để giữ hoa cho ngày kỷ niệm 🌹",
    hashtags: ["#hoahong", "#kyniem"],
  },
]

export const stage06aContent = defineStage({
  id: "06a",
  stage: 6,
  code: "CREATE_CONTENT",
  slug: "create-content",
  title: "Chặng 06a — CREATE · Khu vực B: Nội dung bài đăng",
  summary: "Bài viết theo kênh (tối đa một bài/kênh) sinh từ kịch bản; tự lưu, ghi đè bản cũ cùng khoá ảnh + chủ đề + mode.",
  endpoint: { method: "PUT", path: "/api/v1/creative-production/content-drafts", capability: "I1" },
  input: contentDraftBodySchema,
  output: z.object({ draft: contentDraftSchema }),
  examples: {
    input: { asset_id: EXAMPLE_ASSET_ID, topic_id: exampleTopic.id, mode: "AUTHENTIC", topic_title: exampleTopic.title, posts },
    output: {
      draft: {
        asset_id: EXAMPLE_ASSET_ID,
        topic_id: exampleTopic.id,
        mode: "AUTHENTIC",
        topic_title: exampleTopic.title,
        posts,
        updated_at: EXAMPLE_NOW,
      },
    },
  },
})
