import { createHash, randomUUID } from "node:crypto"

import { conflict, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { SCENE_PLAN_FEATURE, parseStoredScenePlan } from "@/modules/creative-production/domain/scene-plan-rules"
import {
  resolveVariantDirection,
  variantDirectionPayload,
  type PlanSceneHint,
  type VariantDirection,
  type VariantDirectionInput,
} from "@/modules/media/domain/variant-direction-rules"
import {
  candidateDirections,
  candidateIdempotencyKey,
  clampVariantCount,
  renderOptionsPayload,
  resolveComposeMode,
  variantUnitCostCredit,
  type VariantEngine,
  type VariantRenderOptions,
} from "@/modules/media/domain/variant-candidates"
import type { EnqueueJobResult } from "@/modules/jobs/use-cases/enqueue-job"
import {
  ALL_VARIANT_COMBINATIONS,
  isEligibleMasterForVariants,
  MAX_SCENE_PROMPT_LENGTH,
  MEDIA_VARIANT_CLOUD_FEATURE,
  MEDIA_VARIANT_FEATURE,
  type NarrativeSceneIndex,
  type VariantCloudProvider,
  variantBatchIdempotencyKey,
  type VariantCombination,
  type VariantPresetId,
  type VariantRatio,
} from "@/modules/media/domain/variant-rules"

export { MEDIA_VARIANT_FEATURE }

export type RequestVariantsInput = {
  masterAssetId: string
  preset: VariantPresetId
  ratio: VariantRatio
  watermark: boolean
  /** AIC-14 — tự động cân bằng sáng/tương phản, CHỈ ở vùng nền đã ghép
   *  (chốt 18/09, AskUserQuestion: "Chỉ chỉnh phông nền"). Mặc định tắt,
   *  không đổi hành vi cũ khi không truyền. */
  autoEnhance?: boolean
  idempotencyKey: string
  /** Phân cảnh Narrative Arc (Khu vực D Creative Studio) — ghi vào metadata asset. */
  sceneIndex?: NarrativeSceneIndex | undefined
  /** Kịch bản bối cảnh (`creative.scene_plan` job id) mà cảnh này thuộc về. */
  scenePlanId?: string | undefined
  /** Phiên bản kịch bản sản xuất tổng lúc sinh ảnh (Đợt 3, 24/09/2026). */
  scenePlanRevision?: number | undefined
  /** Chỉ đạo khung hình (Đợt 1 nâng cấp chất lượng, 24/09/2026) — thiếu thì lấy từ kịch bản. */
  direction?: VariantDirectionInput | undefined
  /** Số phương án (Đợt 2, 25/09/2026) — 1..4, mặc định 1 (PO chốt 24/09). */
  variantCount?: number | undefined
  /** Chất lượng / tăng nét / cách ghép (Đợt 3, 25/09/2026) — quyết định cả giá. */
  render?: VariantRenderOptions | undefined
}

/**
 * Gợi ý của ĐÚNG cảnh trong kịch bản sản xuất tổng (`shot`, `lighting`,
 * `palette`). Chỉ là gợi ý: không đọc được (kịch bản cơ bản không có job, job
 * chưa xong, id lạ) thì trả `null` — không bao giờ chặn việc tạo ảnh.
 */
async function sceneHintFor(
  ctx: TenantContext,
  scenePlanId: string | undefined,
  sceneIndex: number | undefined
): Promise<PlanSceneHint | null> {
  if (!scenePlanId || !sceneIndex || !/^[0-9a-f-]{36}$/i.test(scenePlanId)) return null
  try {
    const job = await getGenerationJobRepository().findById(ctx, scenePlanId)
    if (!job || job.feature !== SCENE_PLAN_FEATURE || job.status !== "COMPLETED") return null
    const scene = parseStoredScenePlan(job.output)?.scenes.find((s) => s.sceneIndex === sceneIndex)
    return scene ? { shot: scene.shot, lighting: scene.lighting, palette: scene.palette } : null
  } catch {
    return null
  }
}

async function resolveDirection(ctx: TenantContext, input: RequestVariantsInput): Promise<VariantDirection> {
  const hint = await sceneHintFor(ctx, input.scenePlanId, input.sceneIndex)
  return resolveVariantDirection(input.direction ?? {}, hint)
}

/** Một phương án trong lượt gọi — job con của `job_group_id`. */
export type VariantCandidateJob = {
  index: number
  result: EnqueueJobResult
}

export type RequestVariantCandidatesResult = EnqueueJobResult & {
  /** `null` khi chỉ 1 phương án (giữ nguyên hành vi trước Đợt 2). */
  jobGroupId: string | null
  candidates: VariantCandidateJob[]
}

/**
 * `job_group_id` dẫn xuất TẤT ĐỊNH từ khoá idempotency gốc: gửi lại cùng khoá
 * (job con bị `deduped`) thì trả lại đúng nhóm cũ, không đẻ nhóm mới.
 */
export function candidateGroupId(organizationId: string, idempotencyKey: string): string {
  const h = createHash("sha256").update(`${organizationId}|variant-candidates|${idempotencyKey}`).digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

/**
 * Tạo `variant_count` job con (Đợt 2). Mỗi job con đi qua NGUYÊN `enqueueJob`
 * — hạn mức, trừ credit, `Idempotency-Key` riêng (`candidateIdempotencyKey`) —
 * tuần tự, cùng lý do `requestVariantBatch` không `Promise.all`.
 */
async function enqueueCandidates(
  ctx: TenantContext,
  args: {
    feature: string
    engine: VariantEngine
    productId: string | null
    basePayload: Record<string, unknown>
    direction: VariantDirection
    variantCount: number | undefined
    idempotencyKey: string
    render?: VariantRenderOptions | undefined
  }
): Promise<RequestVariantCandidatesResult> {
  // Cách ghép THẬT (đám mây mặc định `relight` = nhà cung cấp trọn gói) — gửi tường
  // minh cho worker để giá và luồng chạy luôn khớp nhau.
  const render: VariantRenderOptions = {
    ...(args.render ?? {}),
    composeMode: resolveComposeMode(args.engine, args.render?.composeMode),
  }
  // Giá theo tham số (Đợt 3): cùng hàm giao diện dùng để hiện credit trước khi bấm.
  const costCredit = variantUnitCostCredit(args.engine, render)
  const count = clampVariantCount(args.variantCount)
  const directions = candidateDirections(args.direction, count, args.engine)
  const jobGroupId = count > 1 ? candidateGroupId(ctx.organizationId, args.idempotencyKey) : null
  const candidates: VariantCandidateJob[] = []
  for (const [index, d] of directions.entries()) {
    const result = await enqueueJob(ctx, {
      feature: args.feature,
      productId: args.productId,
      payload: {
        ...args.basePayload,
        ...variantDirectionPayload(d),
        ...renderOptionsPayload(render),
        ...(count > 1 ? { candidate_index: index + 1, candidate_count: count } : {}),
      },
      costCredit,
      idempotencyKey: candidateIdempotencyKey(args.idempotencyKey, index),
      ...(jobGroupId ? { jobGroupId } : {}),
    })
    candidates.push({ index: index + 1, result })
  }
  const first = candidates[0]!.result
  const total = candidates.reduce((sum, c) => sum + c.result.usage.costCredit, 0)
  const last = candidates[candidates.length - 1]!.result
  return {
    ...first,
    usage: { costCredit: total, balanceAfter: last.usage.balanceAfter ?? first.usage.balanceAfter },
    jobGroupId,
    candidates,
  }
}

/**
 * `POST /media/variants` (`I4`) — M04b, đường DUY NHẤT tạo biến thể marketing.
 *
 * Đi qua nguyên `enqueueJob` của P3, giống hệt M04a: cùng đường hạn mức, cùng
 * giao dịch, cùng `Idempotency-Key`. Bản trước của M04b chạy bằng một route
 * tự `spawn` Python rồi đọc stdout — đường đó không có tổ chức, không có
 * năng lực, không trừ credit, và vi phạm thẳng luật "cấm `subprocess` +
 * parse stdout, cấm chạy job qua HTTP" ở `AGENTS.md`.
 *
 * Kiểm asset TRƯỚC khi vào hàng đợi, cùng lý do như `request-optimization.ts`:
 * một job trỏ vào asset của tổ chức khác chỉ `FAILED` ở worker, sau khi
 * credit đã bị trừ ở bước enqueue.
 *
 * `409` chứ không `403` khi Master chưa duyệt: người gọi CÓ năng lực `I4`,
 * chỉ là bản ghi chưa ở trạng thái dùng được. Trả `403` sẽ đẩy người dùng đi
 * xin thêm quyền cho một việc mà quyền không giải quyết được.
 */
export async function requestVariants(ctx: TenantContext, input: RequestVariantsInput) {
  const master = await getAssetRepository().findById(ctx, input.masterAssetId)
  if (!master) throw notFound()

  if (!isEligibleMasterForVariants(master)) {
    throw conflict(
      "Biến thể marketing chỉ dựng được trên Master Image đã duyệt (cổng 2, media.approve)"
    )
  }

  return enqueueCandidates(ctx, {
    feature: MEDIA_VARIANT_FEATURE,
    engine: "local_studio",
    productId: master.product_id,
    basePayload: {
      master_asset_id: input.masterAssetId,
      preset: input.preset,
      ratio: input.ratio,
      watermark: input.watermark,
      auto_enhance: input.autoEnhance ?? false,
      ...(input.sceneIndex ? { scene_index: input.sceneIndex } : {}),
      ...(input.scenePlanId ? { scene_plan_id: input.scenePlanId } : {}),
      ...(input.scenePlanRevision ? { scene_plan_revision: input.scenePlanRevision } : {}),
    },
    direction: await resolveDirection(ctx, input),
    variantCount: input.variantCount,
    idempotencyKey: input.idempotencyKey,
    render: input.render,
  })
}

export type RequestCloudVariantInput = RequestVariantsInput & {
  /** Bỏ trống = worker thử các nhà cung cấp tương đương theo `VARIANT_PROVIDER_ORDER`. */
  provider?: VariantCloudProvider | undefined
  /** Mô tả KHÔNG GIAN hậu cảnh (không mô tả sản phẩm) — worker luôn nối thêm
   *  ràng buộc "cảnh trống", cắt còn `MAX_SCENE_PROMPT_LENGTH` ký tự. */
  scenePrompt?: string | undefined
}

/**
 * `POST /media/variants` với `engine: "cloud_provider"` (`I4`) — nhánh Cloud
 * của M04b, 23/09/2026.
 *
 * Đi qua CHÍNH `enqueueJob` như nhánh local: kiểm hạn mức, trừ credit, ghi
 * `usage`, `Idempotency-Key`, `NOTIFY` trong một giao dịch. Worker Python
 * (`process_variant_job`) gọi nhà cung cấp để sinh HẬU CẢNH trống, dán nguyên
 * khối chủ thể đã tách từ Master Image, đo Subject Integrity thật; nhà cung
 * cấp lỗi (thiếu khoá, 402/403/429) thì lùi về phông Studio cục bộ của preset
 * và ghi rõ `cloud_fallback` vào asset + sự kiện job.
 *
 * Cùng cổng Master đã duyệt như nhánh local — nhánh Cloud cũ không có cổng này.
 */
export async function requestCloudVariant(ctx: TenantContext, input: RequestCloudVariantInput) {
  const master = await getAssetRepository().findById(ctx, input.masterAssetId)
  if (!master) throw notFound()

  if (!isEligibleMasterForVariants(master)) {
    throw conflict(
      "Biến thể marketing chỉ dựng được trên Master Image đã duyệt (cổng 2, media.approve)"
    )
  }

  const scenePrompt = (input.scenePrompt ?? "").trim().slice(0, MAX_SCENE_PROMPT_LENGTH)

  return enqueueCandidates(ctx, {
    feature: MEDIA_VARIANT_CLOUD_FEATURE,
    engine: "cloud_provider",
    productId: master.product_id,
    basePayload: {
      master_asset_id: input.masterAssetId,
      preset: input.preset,
      ratio: input.ratio,
      watermark: input.watermark,
      auto_enhance: input.autoEnhance ?? false,
      ...(input.provider ? { provider: input.provider } : {}),
      // Thứ tự thử nhà cung cấp (PO 25/09/2026): bên chọn cho lượt → thứ tự tiệm → mặc định.
      provider_order: await providerOrderFor(ctx, "image_variant", input.provider ?? null),
      ...(scenePrompt ? { scene_prompt: scenePrompt } : {}),
      ...(input.sceneIndex ? { scene_index: input.sceneIndex } : {}),
      ...(input.scenePlanId ? { scene_plan_id: input.scenePlanId } : {}),
      ...(input.scenePlanRevision ? { scene_plan_revision: input.scenePlanRevision } : {}),
    },
    direction: await resolveDirection(ctx, input),
    variantCount: input.variantCount,
    idempotencyKey: input.idempotencyKey,
    render: input.render,
  })
}

export type RequestVariantBatchInput = {
  masterAssetId: string
  /** Bỏ trống = toàn bộ ma trận 24 tổ hợp (`ALL_VARIANT_COMBINATIONS`). */
  combinations?: readonly VariantCombination[]
  watermark: boolean
  autoEnhance?: boolean
  /** Nợ #130e (Đợt 2, 25/09/2026): cảnh của kịch bản Chặng 05 để lấy gợi ý
   *  cỡ cảnh / ánh sáng / bảng màu cho CẢ lô — thiếu thì mặc định như Đợt 1. */
  scenePlanId?: string | undefined
  sceneIndex?: NarrativeSceneIndex | undefined
  direction?: VariantDirectionInput | undefined
  /** Khoá gốc của CẢ lượt gọi — mỗi job trong lô có khoá riêng dẫn xuất từ
   *  khoá này (`variantBatchIdempotencyKey`), không dùng thẳng. */
  idempotencyKey: string
}

export type RequestVariantBatchJobResult = {
  preset: VariantPresetId
  ratio: VariantRatio
  jobId: string
  status: string
  deduped: boolean
  costCredit: number
}

export type RequestVariantBatchResult = {
  jobGroupId: string
  jobs: RequestVariantBatchJobResult[]
}

/**
 * `POST /media/variants/batch` (`I4`) — chạy lô nhiều tổ hợp preset×ratio
 * trong MỘT lượt gọi (nợ #108, AIC-17 mở rộng).
 *
 * KHÔNG phải một đường job/hạn mức mới: mỗi tổ hợp vẫn đi qua nguyên
 * `enqueueJob` — vẫn `Idempotency-Key` riêng (dẫn xuất từ khoá gốc, xem
 * `variantBatchIdempotencyKey`), vẫn trừ credit riêng từng job (chốt 18/09:
 * "Tính như hiện tại", không giảm giá theo lô). `job_group_id` là thứ DUY
 * NHẤT lô này thêm — một khoá gom màn tiến độ, không phải khoá nghiệp vụ.
 *
 * Từng job gọi TUẦN TỰ (không `Promise.all`): mỗi lượt `enqueueJob` tự mở
 * giao dịch riêng (kiểm hạn mức + trừ credit + tạo job), chạy song song 24
 * giao dịch cùng lúc trên cùng một tổ chức chỉ để tranh khoá, không nhanh
 * hơn được bao nhiêu. Một tổ hợp lỗi (hết credit/hạn mức) sẽ NÉM lỗi ra
 * ngoài — các job đã tạo trước đó ở lô này đã commit xong, vẫn đứng, xem
 * được qua `job_group_id`; đây là hệ quả tất yếu của "mỗi job một giao dịch
 * riêng", không phải một lỗi cần vá.
 */
export async function requestVariantBatch(
  ctx: TenantContext,
  input: RequestVariantBatchInput
): Promise<RequestVariantBatchResult> {
  const master = await getAssetRepository().findById(ctx, input.masterAssetId)
  if (!master) throw notFound()

  if (!isEligibleMasterForVariants(master)) {
    throw conflict(
      "Biến thể marketing chỉ dựng được trên Master Image đã duyệt (cổng 2, media.approve)"
    )
  }

  const combinations = input.combinations ?? ALL_VARIANT_COMBINATIONS
  const jobGroupId = randomUUID()
  // Một lần cho cả lô — cùng một cảnh nên cùng chỉ đạo khung hình.
  const hint = await sceneHintFor(ctx, input.scenePlanId, input.sceneIndex)
  const direction = variantDirectionPayload(resolveVariantDirection(input.direction ?? {}, hint))
  const jobs: RequestVariantBatchJobResult[] = []

  for (const combo of combinations) {
    const result = await enqueueJob(ctx, {
      feature: MEDIA_VARIANT_FEATURE,
      productId: master.product_id,
      payload: {
        master_asset_id: input.masterAssetId,
        preset: combo.preset,
        ratio: combo.ratio,
        watermark: input.watermark,
        auto_enhance: input.autoEnhance ?? false,
        ...(input.sceneIndex ? { scene_index: input.sceneIndex } : {}),
        ...(input.scenePlanId ? { scene_plan_id: input.scenePlanId } : {}),
        ...direction,
      },
      idempotencyKey: variantBatchIdempotencyKey(input.idempotencyKey, combo),
      jobGroupId,
    })
    jobs.push({
      preset: combo.preset,
      ratio: combo.ratio,
      jobId: result.job.id,
      status: result.job.status,
      deduped: result.deduped,
      costCredit: result.usage.costCredit,
    })
  }

  return { jobGroupId, jobs }
}
