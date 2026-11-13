/** Chặng 07 — PACKAGE: đóng gói chiến dịch (DRAFT) neo vào Master Image đã duyệt. */

import { z } from "zod"

import { defineStage } from "./define-stage"
import { packagePostsSchema, productionModeSchema, topicSnapshotSchema } from "./common"
import { campaignPackageViewSchema } from "./campaign-package"
import { examplePackageDraft } from "./examples-package"

export const createPackageBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  mode: productionModeSchema,
  master_asset_id: z.string().min(1).describe("Master Image đã duyệt (cổng 2, I2)"),
  topic: topicSnapshotSchema.optional(),
  posts: packagePostsSchema.optional(),
  variant_asset_ids: z.array(z.string().min(1)).max(40).optional().describe("Biến thể MARKETING của đúng Master"),
  video_job_id: z.string().min(1).nullish().describe("Video chính (API cũ) — gộp vào video_job_ids"),
  video_job_ids: z.array(z.string().min(1)).max(8).optional().describe("Mỗi khung hình trong phạm vi một video"),
  audio_job_id: z.string().min(1).nullish(),
})

export const stage07Package = defineStage({
  id: "07",
  stage: 7,
  code: "PACKAGE",
  slug: "package",
  title: "Chặng 07 — PACKAGE: Đóng gói trọn bộ chiến dịch",
  summary:
    "Gom bài B, âm thanh C, ảnh D, video E vào campaign_packages (DRAFT). Sửa gói (PATCH) đưa về DRAFT và xoá kết quả QA cũ.",
  endpoint: { method: "POST", path: "/api/v1/creative-production/packages", capability: "I1" },
  input: createPackageBodySchema,
  output: campaignPackageViewSchema,
  examples: {
    input: {
      name: examplePackageDraft.name,
      mode: "AUTHENTIC",
      master_asset_id: examplePackageDraft.master_asset_id,
      topic: examplePackageDraft.topic,
      posts: examplePackageDraft.posts,
      variant_asset_ids: examplePackageDraft.variant_asset_ids,
      video_job_id: null,
      audio_job_id: null,
    },
    output: examplePackageDraft,
  },
})
