import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { JobEventRepository, getJobEventRepository } from "@/modules/jobs/infra/job-event-repository"
import {
  canApproveOptimization,
  isGuardResult,
  parseIdentityGuardBlock,
  requiresWarningBeforeApprove,
  optimizationPriceKey,
  type IdentityGuardBlock,
} from "@/modules/media/domain/optimization-rules"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"
import { lyDoHoanCredit } from "@/modules/usage/domain/refund-policy"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { refundPartial } from "@/modules/usage/use-cases/refund-partial"

export type OptimizationDetail = {
  job_id: string
  status: string
  stage: string | null
  error: string | null
  result: string | null
  identity_guard: IdentityGuardBlock | null
  outputs: {
    master: string | null
    master_url: string | null
    original_url: string | null
    ratios: Record<string, string>
    ratio_urls: Record<string, string>
    variant_urls?: Record<string, string>
    variant_ratio_urls?: Record<string, Record<string, string>>
  }
  approval: {
    state: "pending" | "approved" | "rejected"
    approved_by: string | null
    approved_at: string | null
    /** `YC-R5` — `REJECTED` không vào được luồng duyệt. */
    can_approve: boolean
    /** `YC-R6` — giao diện PHẢI cảnh báo trước khi bấm duyệt. Máy chủ nói
     *  thẳng cờ này thay vì để mỗi màn hình tự suy từ chuỗi `result`. */
    requires_warning: boolean
  }
  flags: Record<string, unknown>
  parameters?: Record<string, unknown>
  applied_changes?: string[]
}

const TRANG_THAI: Record<string, "pending" | "approved" | "rejected"> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
}

const PREVIEW_EXPIRES_IN = 3600

/**
 * `GET /media/optimizations/:id` (`I1`, đặc tả 06 mục 8). `:id` là `job_id` —
 * M04a không có bảng riêng, một lượt tối ưu CHÍNH LÀ một `generation_jobs`.
 */
export async function getOptimization(
  ctx: TenantContext,
  jobId: string
): Promise<OptimizationDetail> {
  const job = await getGenerationJobRepository().findById(ctx, jobId)
  if (!job) throw notFound()

  // Hoàn credit lúc đọc (25/09/2026, cùng khuôn biến thể/âm thanh) — idempotent:
  // Guard từ chối / hỏng / huỷ → hoàn toàn phần; bộ máy nhà cung cấp lỗi và
  // worker lùi `StudioEnhancer` (`output.provider_fallback`) → hoàn phần chênh
  // giữa giá nhà cung cấp và giá cục bộ.
  const config = (job.payload as { config?: Record<string, unknown> } | null)?.config
  if (lyDoHoanCredit(job) !== null) {
    await refundJob(ctx, jobId).catch(() => undefined)
  } else if (
    job.status === "COMPLETED" &&
    optimizationPriceKey(config) === "media.optimize.cloud" &&
    (job.output as { provider_fallback?: unknown } | null)?.provider_fallback === true
  ) {
    const chenh = costCreditForFeature("media.optimize.cloud") - costCreditForFeature("media.optimize")
    await refundPartial(ctx, jobId, "cloud-lui-cuc-bo", chenh).catch(() => undefined)
  }

  // Quyền sở hữu job đã kiểm ở trên — `job_events` không mang
  // `organization_id` nên thứ tự này là bắt buộc, không phải tuỳ chọn.
  const suKien = await getJobEventRepository().findLatestByType(jobId, "guard")
  const guard = parseIdentityGuardBlock(suKien?.payload)

  const assetRepo = getAssetRepository()
  const storage = getStorageProvider()

  const master = await assetRepo.findMasterByJobId(ctx, jobId)
  const ketQua = isGuardResult(job.result) ? job.result : null

  // Lấy ảnh gốc ban đầu từ job payload nếu có
  let originalUrl: string | null = null
  const payloadObj = job.payload && typeof job.payload === "object" ? (job.payload as Record<string, unknown>) : null
  const rawAssetId = payloadObj?.asset_id ? String(payloadObj.asset_id) : null
  if (rawAssetId) {
    const rawAsset = await assetRepo.findById(ctx, rawAssetId)
    if (rawAsset) {
      originalUrl = await storage.signedUrl(rawAsset.storage_key, PREVIEW_EXPIRES_IN)
    }
  }

  // Lấy Master Image URL
  let masterUrl: string | null = null
  if (master) {
    masterUrl = await storage.signedUrl(master.storage_key, PREVIEW_EXPIRES_IN)
  }

  // Lấy các bản dẫn xuất tỷ lệ Smart Reframe (1:1, 4:5, 9:16, 16:9)
  const ratios: Record<string, string> = {}
  const ratioUrls: Record<string, string> = {}
  if (master) {
    const derived = await assetRepo.listDerivedFrom(ctx, master.id)
    for (const d of derived) {
      if (d.kind === "RATIO") {
        const meta = d.metadata && typeof d.metadata === "object" ? (d.metadata as Record<string, unknown>) : null
        const ratioKey = meta?.ratio ? String(meta.ratio) : null
        if (ratioKey) {
          ratios[ratioKey] = d.id
          ratioUrls[ratioKey] = await storage.signedUrl(d.storage_key, PREVIEW_EXPIRES_IN)
        }
      }
    }
  }

  // Lấy các bản biến thể đa phong cách (Studio, Lifestyle, Bokeh) nếu có
  const jobOutput = job.output && typeof job.output === "object" ? (job.output as Record<string, unknown>) : null
  const variantKeys = jobOutput?.variants && typeof jobOutput.variants === "object" ? (jobOutput.variants as Record<string, string>) : {}
  const variantUrls: Record<string, string> = {}
  for (const [vKey, vStorageKey] of Object.entries(variantKeys)) {
    if (typeof vStorageKey === "string") {
      variantUrls[vKey] = await storage.signedUrl(vStorageKey, PREVIEW_EXPIRES_IN)
    }
  }

  // Lấy các bản Smart Reframe 4 tỷ lệ riêng cho từng biến thể
  const variantRatiosRaw =
    jobOutput?.variant_ratios && typeof jobOutput.variant_ratios === "object"
      ? (jobOutput.variant_ratios as Record<string, Record<string, string>>)
      : {}
  const variantRatioUrls: Record<string, Record<string, string>> = {}
  for (const [vKey, ratioMap] of Object.entries(variantRatiosRaw)) {
    if (ratioMap && typeof ratioMap === "object") {
      variantRatioUrls[vKey] = {}
      for (const [rKey, rStorageKey] of Object.entries(ratioMap)) {
        if (typeof rStorageKey === "string") {
          variantRatioUrls[vKey][rKey] = await storage.signedUrl(rStorageKey, PREVIEW_EXPIRES_IN)
        }
      }
    }
  }

  return {
    job_id: job.id,
    status: job.status,
    stage: job.stage,
    error: job.error,
    result: job.result,
    identity_guard: guard,
    outputs: {
      master: master?.id ?? null,
      master_url: masterUrl,
      original_url: originalUrl,
      ratios,
      ratio_urls: ratioUrls,
      variant_urls: variantUrls,
      variant_ratio_urls: variantRatioUrls,
    },
    approval: {
      state: ketQua === "REJECTED" ? "rejected" : master ? (TRANG_THAI[master.approval_state] ?? "pending") : "pending",
      approved_by: master?.approved_by ?? null,
      approved_at: master?.approved_at?.toISOString() ?? null,
      can_approve: Boolean(master) && ketQua !== null && canApproveOptimization(ketQua),
      requires_warning: ketQua !== null && requiresWarningBeforeApprove(ketQua),
    },
    flags: (master?.generated_flags as Record<string, unknown> | null) ?? {},
    parameters: (master?.parameters as Record<string, unknown> | null) ?? {},
    applied_changes: (() => {
      const masterParams = (master?.parameters as Record<string, unknown> | null) ?? {}
      if (Array.isArray(masterParams.applied_changes)) {
        return masterParams.applied_changes.filter((x): x is string => typeof x === "string")
      }
      const jobOutput = job.output && typeof job.output === "object" ? (job.output as Record<string, unknown>) : null
      if (Array.isArray(jobOutput?.applied_changes)) {
        return jobOutput.applied_changes.filter((x): x is string => typeof x === "string")
      }
      return []
    })(),
  }
}

