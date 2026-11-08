import { z } from "zod"

import { jobStatusSchema, usageSchema } from "@/modules/creative-production/contracts/common"

export { mediaVariantResultSchema } from "@/modules/creative-production/contracts/stage-06c-media"

/**
 * Phản hồi `/api/v1/media/*` — tối ưu ảnh (M04a) và biến thể marketing (M04b) (OpenAPI nội bộ, PO 07/11/2026). Sinh từ
 * kiểu TS của use-case rồi kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-media.test.ts`. Mọi URL ảnh là URL
 * ký có hạn.
 */
const VERDICT = z.enum(["SAFE", "GOOD", "WARNING", "REJECTED"])
const APPROVAL = z.enum(["pending", "approved", "rejected"])

export const optimizationCreatedResponse = z.strictObject({
  job_id: z.string(),
  status: jobStatusSchema,
  /** Máy chủ quyết định: nhà cung cấp trước, cục bộ chỉ khi chọn đích danh. */
  engine: z.string(),
  usage: usageSchema,
})

export const optimizationResponse = z.strictObject({
  job_id: z.string(),
  status: z.string(),
  stage: z.string().nullable(),
  error: z.string().nullable(),
  result: z.string().nullable(),
  /** Phán quyết Identity Guard do worker đo; `null` khi job chưa xong. */
  identity_guard: z
    .strictObject({
      identity_score: z.number(),
      color_score: z.number(),
      geometry_score: z.number(),
      component_consistency: z.number(),
      result: VERDICT,
      ly_do: z.array(z.string()),
      provider: z.string().optional(),
      model_version: z.string().optional(),
    })
    .nullable(),
  outputs: z.strictObject({
    master: z.string().nullable(),
    master_url: z.string().nullable(),
    original_url: z.string().nullable(),
    ratios: z.record(z.string(), z.string()),
    ratio_urls: z.record(z.string(), z.string()),
    variant_urls: z.record(z.string(), z.string()).optional(),
    variant_ratio_urls: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  }),
  approval: z.strictObject({
    state: APPROVAL,
    approved_by: z.string().nullable(),
    approved_at: z.string().nullable(),
    can_approve: z.boolean(),
    requires_warning: z.boolean(),
  }),
  flags: z.record(z.string(), z.unknown()),
  parameters: z.record(z.string(), z.unknown()).optional(),
  applied_changes: z.array(z.string()).optional(),
})

export const pendingOptimizationsResponse = z.strictObject({
  data: z.array(z.strictObject({ job_id: z.string(), result: z.string().nullable(), completed_at: z.string().nullable(), requires_warning: z.boolean() })),
})

/** URL ký sẵn có hạn — route không stream byte. */
export const downloadResponse = z.strictObject({ url: z.string(), asset_id: z.string(), expires_in: z.number() })

export const promoteToMasterResponse = z.strictObject({ master_asset_id: z.string(), approval_state: z.literal("APPROVED") })

export const variantBatchResponse = z.strictObject({
  job_group_id: z.string(),
  jobs: z.array(
    z.strictObject({ job_id: z.string(), status: jobStatusSchema, preset: z.string(), ratio: z.string(), deduped: z.boolean(), cost_credit: z.number() })
  ),
})

export const variantJobResponse = z.strictObject({
  job_id: z.string(),
  status: z.string(),
  stage: z.string().nullable(),
  error: z.string().nullable(),
  result: z.string().nullable(),
  source: z.strictObject({
    master_asset_id: z.string().nullable(),
    master_url: z.string().nullable(),
    preset: z.string().nullable(),
    ratio: z.string().nullable(),
    watermark: z.boolean(),
    engine: z.enum(["local_studio", "cloud_provider"]),
    scene_index: z.number().nullable(),
    cloud_fallback: z.boolean(),
    cloud_fallback_reason: z.string().nullable(),
    job_group_id: z.string().nullable(),
    candidate_index: z.number().nullable(),
    candidate_count: z.number().nullable(),
    direction: z.record(z.string(), z.unknown()).nullable(),
  }),
  /** Số đo cổng Subject Integrity do worker ghi; `null` khi job chưa xong. */
  subject_integrity: z
    .strictObject({
      subject_pixel_identity: z.number(),
      generative_fill_used: z.boolean(),
      source_master_asset_id: z.string(),
      result: VERDICT,
      ly_do: z.array(z.string()),
      method: z.enum(["pixel_exact", "perceptual"]),
      perceptual: z.strictObject({ structure_ssim: z.number().nullable(), color_delta_e: z.number().nullable(), shape_iou: z.number().nullable() }).optional(),
      ai_relit: z.boolean(),
    })
    .nullable(),
  quality_report: z
    .strictObject({
      aesthetic: z.strictObject({ score: z.number(), components: z.record(z.string(), z.number()), version: z.string() }).nullable(),
      edge_fade: z.record(z.string(), z.unknown()).nullable(),
      segmentation: z.record(z.string(), z.unknown()).nullable(),
      quality: z.string(),
      upscale: z.string(),
      compose_mode: z.string(),
      flow: z.string(),
      ai_relit: z.boolean(),
      integrity_method: z.string(),
      provider_steps: z.record(z.string(), z.unknown()).nullable(),
    })
    .nullable(),
  variants: z.array(
    z.strictObject({
      asset_id: z.string(),
      variant_key: z.string(),
      title: z.string(),
      background: z.string(),
      ratio: z.string(),
      watermark: z.boolean(),
      generative_fill_used: z.boolean(),
      url: z.string(),
      approval_state: APPROVAL,
      approved_at: z.string().nullable(),
    })
  ),
  approval: z.strictObject({ can_approve: z.boolean(), requires_warning: z.boolean() }),
})

export const pendingVariantsResponse = z.strictObject({
  data: z.array(z.strictObject({ job_id: z.string(), completed_at: z.string().nullable(), pending_count: z.number(), total_count: z.number() })),
})
