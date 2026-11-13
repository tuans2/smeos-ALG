import { AppError } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { requestAnalysis } from "@/modules/products/use-cases/request-analysis"
import { getAnalysis } from "@/modules/products/use-cases/get-analysis"
import { approveAnalysis } from "@/modules/products/use-cases/approve-analysis"
import { generateProductCopy } from "@/modules/product-copies/use-cases/generate-product-copy"
import { suggestCostFromBom } from "@/modules/costing/use-cases/costing-service"
import { generateContent } from "@/modules/content-engine/use-cases/generate-content"
import { getJob } from "@/modules/jobs/use-cases/get-job"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { extractProductFieldsFromAnalysis, resolveEffectiveAnalysis } from "@/modules/products/domain/product-analysis-rules"
import { orderFlowerLines } from "@/modules/greeting-card/domain/flower-substitute"
import { createPrintRenditionUseCase } from "@/modules/print/use-cases/create-print-rendition.use-case"
import {
  EMPTY_KIT_OUTPUTS, KIT_CHANNELS, KIT_STEP_LABEL, kitStepKey,
  type KitOutputs, type KitResult, type KitStep,
} from "../domain/one-image-kit"

/** Các bước thật; test thay được từng bước (vd. giả lập AI hỏng giữa chừng). */
export interface KitSteps {
  analysis: typeof getAnalysis
  approve: typeof approveAnalysis
  copy: typeof generateProductCopy
  cost: typeof suggestCostFromBom
  posts: typeof generateContent
  card: typeof createPrintRenditionUseCase
}

const REAL_STEPS: KitSteps = {
  analysis: getAnalysis, approve: approveAnalysis, copy: generateProductCopy, cost: suggestCostFromBom, posts: generateContent, card: createPrintRenditionUseCase,
}

/**
 * Chặng 01–02: tải ảnh xong thì gửi nhận diện (job `vision.analyze`, trừ credit lúc tạo job, worker
 * hoàn khi hỏng). Giao diện theo dõi job tới khi có kết quả để người dùng kiểm tra (chặng 08).
 */
export async function startOneImageKit(ctx: TenantContext, input: { assetId: string; idempotencyKey: string }) {
  requireCapability(ctx, "H1")
  return requestAnalysis(ctx, { assetIds: [input.assetId], idempotencyKey: `${input.idempotencyKey}:analyze` })
}

/**
 * Chặng 08: tiến độ nhận diện và tóm tắt kết quả để người dùng kiểm tra trước khi duyệt. Job hỏng →
 * `jobStatus = FAILED` (worker đã hoàn credit của lượt nhận diện).
 */
export async function oneImageKitProgress(ctx: TenantContext, input: { jobId: string; assetId: string }) {
  requireCapability(ctx, "H1")
  const job = await getJob(ctx, input.jobId)
  const found = await new ProductAnalysisRepository().findByAssetId(ctx, input.assetId)
  if (!found) return { jobStatus: job.status, analysis: null }
  const detail = await getAnalysis(ctx, found.id)
  const effective = resolveEffectiveAnalysis(detail.raw, detail.edited)
  const fields = extractProductFieldsFromAnalysis(effective)
  const bom = (effective.bom ?? null) as unknown
  return {
    jobStatus: job.status,
    analysis: {
      id: detail.id, approvalState: detail.approval_state, imageUrl: detail.image_url,
      category: fields.category, flowers: orderFlowerLines(bom).map((l) => ({ name: l.flowerName, quantity: l.quantity, unit: l.unit, role: l.role })),
    },
  }
}

const messageOf = (e: unknown) => (e instanceof AppError || e instanceof Error ? e.message : "Bước này chưa chạy được")

/**
 * Chặng 09–10 sau khi người dùng đã kiểm tra kết quả nhận diện: duyệt → thẻ sản phẩm nháp → nội dung
 * bán hàng → giá vốn đề xuất → bài đăng → thẻ A6. Bước nào hỏng thì dừng, trả các đầu ra đã có; job của
 * bước hỏng tự hoàn credit. Chạy lại an toàn: phân tích đã duyệt và bản nội dung đã có không tính tiền lại.
 */
export async function runOneImageKit(
  ctx: TenantContext,
  input: { analysisId: string; idempotencyKey: string },
  steps: KitSteps = REAL_STEPS,
): Promise<KitResult> {
  requireCapability(ctx, "H3")
  const outputs: KitOutputs = { ...EMPTY_KIT_OUTPUTS, posts: [] }
  const fail = (step: KitStep, e: unknown): KitResult => ({ status: "FAILED", outputs, failedStep: step, error: `${KIT_STEP_LABEL[step]}: ${messageOf(e)}` })

  let assetId: string
  try {
    let analysis = await steps.analysis(ctx, input.analysisId)
    if (analysis.approval_state !== "APPROVED") analysis = await steps.approve(ctx, input.analysisId, { createProduct: true })
    if (!analysis.product_id) throw new AppError("CONFLICT", "Chưa tạo được thẻ sản phẩm từ ảnh")
    outputs.productId = analysis.product_id
    assetId = analysis.asset_id
  } catch (e) {
    return fail("PRODUCT", e)
  }
  const productId = outputs.productId

  try {
    outputs.copyId = (await steps.copy(ctx, { analysisId: input.analysisId, productId, idempotencyKey: kitStepKey(input.idempotencyKey, "COPY") })).copyId
  } catch (e) {
    return fail("COPY", e)
  }

  try {
    const { cost, unmatched } = await steps.cost(ctx, productId)
    outputs.cost = { totalVnd: cost.totalVnd, complete: cost.complete, missingPrices: [...cost.missingPrices], unmatched }
  } catch (e) {
    return fail("COST", e)
  }

  try {
    const generated = await steps.posts(ctx, { productId, channels: KIT_CHANNELS, idempotencyKey: kitStepKey(input.idempotencyKey, "POSTS") })
    if (generated.status === "FAILED" || !generated.generationId) throw new AppError("INTERNAL", "Chưa sinh được bài đăng")
    outputs.contentGenerationId = generated.generationId
    outputs.posts = generated.posts.map((p) => ({ channel: p.channel, text: p.text, hashtags: [...p.hashtags], needsReview: p.needsReview }))
  } catch (e) {
    return fail("POSTS", e)
  }

  try {
    requireCapability(ctx, "M5")
    const card = await steps.card(ctx, { assetId, sourceType: "product", sourceId: productId, presetCode: "A6", hasQrCode: true })
    outputs.printRenditionId = card.id
  } catch (e) {
    return fail("CARD", e)
  }

  return { status: "READY", outputs, failedStep: null, error: null }
}
