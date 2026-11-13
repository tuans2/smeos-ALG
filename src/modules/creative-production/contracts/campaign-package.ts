/**
 * Hợp đồng gói chiến dịch (Chặng 07–10) và số đo (Chặng 11–14).
 * Phản chiếu `domain/campaign-package-rules.ts` và hai use-case
 * `manage-campaign-package.ts`, `get-campaign-performance.ts`.
 */

import { z } from "zod"

import { MIN_PACKAGES_FOR_PATTERNS, PACKAGE_CHANNELS } from "../domain/campaign-package-rules"
import {
  approvalStateSchema,
  campaignPackageStatusSchema,
  isoDateTimeSchema,
  packageChannelSchema,
  packagePostSchema,
  productionModeSchema,
  topicSnapshotSchema,
} from "./common"

export const qaVerdictSchema = z.enum(["PASS", "NEEDS_REVIEW", "REJECTED"])

export const qaReportSchema = z.object({
  verdict: qaVerdictSchema,
  checks: z.array(
    z.object({
      id: z.enum(["product_integrity", "approvals", "platform_specs", "content", "brand", "plan_consistency", "scope_coverage"]),
      title: z.string(),
      verdict: qaVerdictSchema,
      reasons: z.array(z.string()),
    })
  ),
  checkedAt: isoDateTimeSchema,
})

export const launchPlanSchema = z.object({
  channels: z.array(packageChannelSchema),
  scheduledAt: isoDateTimeSchema.nullable(),
  postRefs: z.array(z.object({ platform: packageChannelSchema, contentId: z.string() })),
})

/** Thân `PUT /packages/:id/launch` (Chặng 10). */
export const launchPlanBodySchema = z.object({
  channels: z.array(z.enum(PACKAGE_CHANNELS)).min(1).max(PACKAGE_CHANNELS.length),
  scheduled_at: z.string().datetime().nullish(),
  post_refs: z
    .array(z.object({ platform: z.enum(PACKAGE_CHANNELS), content_id: z.string().trim().min(1).max(200) }))
    .max(50)
    .default([]),
})

const packageVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  stage: z.string(),
  video_approval: approvalStateSchema,
  aspect_ratio: z.string(),
  final_video_url: z.string().nullable(),
  script_approval: approvalStateSchema,
  view_url: z.string().nullable().describe("URL ký có hạn để phát video"),
})

/** `CampaignPackageView` — đầu ra chung của Chặng 07, 08, 09, 10. */
export const campaignPackageViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: productionModeSchema,
  status: campaignPackageStatusSchema,
  master_asset_id: z.string(),
  product_id: z.string().nullable(),
  topic: topicSnapshotSchema.nullable(),
  posts: z.array(packagePostSchema),
  variant_asset_ids: z.array(z.string()),
  video_job_id: z.string().nullable().describe("Video chính (= video_job_ids[0])"),
  video_job_ids: z.array(z.string()).describe("Mọi video của gói — mỗi khung hình trong phạm vi một video"),
  audio_job_id: z.string().nullable(),
  variants: z.array(
    z.object({
      asset_id: z.string(),
      url: z.string().describe("URL ký có hạn"),
      aspect_ratio: z.string().nullable(),
      identity_score: z.number().nullable(),
      approval_state: approvalStateSchema,
      scene_index: z.number().int().nullable(),
      watermark: z.boolean(),
    })
  ),
  video: packageVideoSchema.nullable().describe("Video chính (= videos[0])"),
  videos: z.array(packageVideoSchema).describe("Mọi video của gói, theo thứ tự video_job_ids"),
  audio: z.object({ job_id: z.string(), stage: z.string(), audio_url: z.string().nullable() }).nullable(),
  qa_report: qaReportSchema.nullable(),
  qa_checked_at: isoDateTimeSchema.nullable(),
  approved_by: z.string().nullable(),
  approved_at: isoDateTimeSchema.nullable(),
  launch_plan: launchPlanSchema.nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
})

// ─── Chặng 11–14 ─────────────────────────────────────────────────────────────

const nullableMetric = z.number().nullable().describe("null = chưa có số")

export const sellSchema = z.object({
  conversations_since_approval: z.number().int(),
  orders: z.number().int(),
})

export const measureSchema = z.object({
  since: isoDateTimeSchema.nullable(),
  orders: z.object({ count: z.number().int(), quantity: z.number(), revenueVnd: z.number() }),
  conversations: z.number().int(),
  channel: z.object({
    linkedPosts: z.number().int(),
    postsWithData: z.number().int(),
    reach: nullableMetric,
    impressions: nullableMetric,
    engagement: nullableMetric,
    clicks: nullableMetric,
    conversions: nullableMetric,
  }),
  caveats: z.array(z.string()).describe("Giới hạn của phép đo — hiển thị nguyên văn"),
})

export const learnSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("INSUFFICIENT_DATA"),
    have: z.number().int(),
    need: z.number().int().describe(`Tối thiểu ${MIN_PACKAGES_FOR_PATTERNS} gói có số đo`),
  }),
  z.object({
    status: z.literal("OK"),
    basedOn: z.number().int(),
    patterns: z.array(
      z.object({
        dimension: z.enum(["angleCategory", "scene2Preset", "hasVideo"]),
        value: z.string(),
        packages: z.number().int(),
        avgRevenueVnd: z.number(),
        avgOrders: z.number(),
      })
    ),
  }),
])

export const nextActionSchema = z.object({
  id: z.string(),
  title: z.string(),
  why: z.string(),
  target: z.enum(["area-b", "area-d", "area-e", "area-f", "/lich-dang", "/hoi-thoai"]),
})

/** Đầu ra đầy đủ của `GET /packages/:id/performance` — Chặng 11–14 là các lát cắt của nó. */
export const campaignPerformanceSchema = z.object({
  package_id: z.string(),
  status: campaignPackageStatusSchema,
  sell: sellSchema,
  measure: measureSchema,
  learn: learnSchema,
  next_best_actions: z.array(nextActionSchema),
  computed_at: isoDateTimeSchema,
})
