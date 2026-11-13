import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getAssetRepository } from "@/modules/assets/infra/asset-repository"
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { buildEnhancePrompt } from "../domain/prompt-builder"
import { BACKGROUND_PRESETS } from "../domain/preset-catalog"

export const PRODUCT_PHOTO_FEATURE = "media.optimize"

export interface CreateProductPhotoJobInput {
  assetId: string
  presetId?: string | undefined
  aspectRatio?: string | undefined
  customNote?: string | undefined
  idempotencyKey: string
  retryHint?: string | undefined
  failedCriteria?: string[] | undefined
}

export async function createProductPhotoJob(
  ctx: TenantContext,
  input: CreateProductPhotoJobInput,
  assetRepo: IAssetRepository = getAssetRepository()
) {
  if (!input.assetId) {
    throw validationFailed({ assetId: "Bắt buộc phải chọn ảnh sản phẩm" })
  }

  const asset = await assetRepo.findById(ctx, input.assetId)
  if (!asset) {
    throw notFound()
  }

  const prompt = buildEnhancePrompt({
    presetId: input.presetId,
    customNote: input.customNote,
    retryHint: input.retryHint,
    failedCriteria: input.failedCriteria,
  })

  // Cấu hình provider single-call: Gemini -> OpenAI -> Fal -> Photoroom -> PIL
  const config = {
    mode: "single_call",
    provider_order: ["imagen", "openai", "fal", "photoroom"],
    prompt_used: prompt,
    preset_id: input.presetId ?? "auto",
    aspect_ratio: input.aspectRatio ?? "auto",
    custom_note: input.customNote,
    retry_hint: input.retryHint,
    failed_criteria: input.failedCriteria,
  }

  return enqueueJob(ctx, {
    feature: PRODUCT_PHOTO_FEATURE,
    productId: asset.product_id,
    payload: {
      asset_id: input.assetId,
      config,
    },
    idempotencyKey: input.idempotencyKey,
  })
}
