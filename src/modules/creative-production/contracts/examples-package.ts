/**
 * Ví dụ Chặng 07–14 — dựng bằng CHÍNH hàm domain (QA, số đo, mẫu thắng, hành
 * động kế tiếp) nên luôn khớp luật hiện hành; không phải dữ liệu thật.
 */

import {
  evaluateCampaignQa,
  extractWinningPatterns,
  nextBestActions,
  summarizePerformance,
} from "../domain/campaign-package-rules"
import { toExample } from "./deep-mutable"
import { EXAMPLE_JOB_ID, EXAMPLE_NOW, EXAMPLE_PACKAGE_ID, EXAMPLE_PRODUCT_ID, exampleTopic } from "./examples-shared"

const now = new Date(EXAMPLE_NOW)
const approvedAt = new Date("2026-09-20T02:00:00.000Z")
const masterId = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b"
const variantId = "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8c"

const posts = [
  { channel: "tiktok" as const, text: "12 bông hồng cho 12 tháng yêu nhau 🌹 Nhắn tiệm giữ hoa nhé!", hashtags: ["#hoahong", "#kyniem"] },
]

export const exampleQaReport = toExample(
  evaluateCampaignQa({
    posts,
    variants: [
      { assetId: variantId, approvalState: "APPROVED", identityScore: 0.9995, aspectRatio: "9:16", watermark: true, scenePlanId: EXAMPLE_JOB_ID, scenePlanRevision: 1 },
    ],
    video: null,
    audio: null,
    plan: { scenePlanId: EXAMPLE_JOB_ID, revision: 1 },
    brand: { hasLogo: true, forbiddenStyles: null },
    now,
  })
)

const baseView = {
  id: EXAMPLE_PACKAGE_ID,
  name: "Kỷ niệm — Bó hồng đỏ 12 bông",
  mode: "AUTHENTIC" as const,
  master_asset_id: masterId,
  product_id: EXAMPLE_PRODUCT_ID,
  topic: {
    id: exampleTopic.id,
    title: exampleTopic.title,
    angleCategory: exampleTopic.angleCategory,
    hook: exampleTopic.hook,
    cta: exampleTopic.cta,
    scenePlanId: EXAMPLE_JOB_ID,
    scenePlanRevision: 1,
  },
  posts,
  variant_asset_ids: [variantId],
  video_job_id: null,
  video_job_ids: [] as string[],
  audio_job_id: null,
  variants: [
    {
      asset_id: variantId,
      url: "https://storage.example/signed/e5f6a7b8.jpg",
      aspect_ratio: "9:16",
      identity_score: 0.9995,
      approval_state: "APPROVED" as const,
      scene_index: 2,
      watermark: true,
    },
  ],
  video: null,
  videos: [],
  audio: null,
  approved_by: null,
  approved_at: null,
  launch_plan: null,
  created_at: EXAMPLE_NOW,
  updated_at: EXAMPLE_NOW,
}

export const examplePackageDraft = { ...baseView, status: "DRAFT" as const, qa_report: null, qa_checked_at: null }
export const examplePackageQa = { ...baseView, status: "QA_PASSED" as const, qa_report: exampleQaReport, qa_checked_at: EXAMPLE_NOW }
export const examplePackageApproved = {
  ...examplePackageQa,
  status: "APPROVED" as const,
  approved_by: "11111111-2222-4333-8444-555555555555",
  approved_at: approvedAt.toISOString(),
}
export const examplePackageLaunched = {
  ...examplePackageApproved,
  launch_plan: {
    channels: ["tiktok" as const],
    scheduledAt: "2026-09-25T12:00:00.000Z",
    postRefs: [{ platform: "tiktok" as const, contentId: "sf-post-8812" }],
  },
}

const performance = summarizePerformance({
  approvedAt,
  orders: [{ createdAt: new Date("2026-09-21T03:00:00.000Z"), status: "COMPLETED", productRevenueVnd: 650000, productQuantity: 1 }],
  conversationsSince: 7,
  postRefs: [{ platform: "tiktok", contentId: "sf-post-8812" }],
  metrics: [{ platform: "tiktok", contentId: "sf-post-8812", reach: 5200, impressions: 8100, engagement: 430, clicks: 61, conversions: 3 }],
})
const learn = extractWinningPatterns([])

export const examplePerformance = toExample({
  package_id: EXAMPLE_PACKAGE_ID,
  status: "APPROVED" as const,
  sell: { conversations_since_approval: performance.conversations, orders: performance.orders.count },
  measure: performance,
  learn,
  next_best_actions: nextBestActions({
    now,
    status: "APPROVED",
    approvedAt,
    hasVideo: false,
    postRefs: 1,
    performance,
    learn,
    packageAngle: "EMOTIONAL",
  }),
  computed_at: EXAMPLE_NOW,
})

