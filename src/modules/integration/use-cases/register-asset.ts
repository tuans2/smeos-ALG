import { validationFailed, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { registerAsset } from "@/modules/assets/use-cases/register-asset"
import { storageKeyMatchesContext } from "@/modules/assets/domain/storage-key"
import type { asset_kind } from "@/modules/assets/infra/entities"

export type RegisterIntegrationAssetInput = {
  assetId: string
  productId: string | null
  parentAssetId: string
  kind: asset_kind
  storageKey: string
  mimeType: string
  width?: number | null
  height?: number | null
  aspectRatio?: string | null
  fileSize?: number | null
  provider?: string | null
  model?: string | null
  modelVersion?: string | null
  pipelineVersion?: string | null
  parameters?: Record<string, unknown> | null
  prompt?: string | null
  outputSha256?: string | null
  qualityScore?: number | null
  identityScore?: number | null
  generatedFlags?: Record<string, unknown> | null
  costUsd?: number | null
}

/**
 * `POST /integration/assets` (đặc tả 06 mục 11, đặc tả 08 mục 4): "Đăng ký asset dẫn xuất".
 * Engine ngoài (LocalBudd/SocialFlow) đăng ký asset đã hoàn tất (marketing, video, catalog...).
 *
 * Yêu cầu:
 * - `parent_asset_id` bắt buộc trỏ tới asset `APPROVED` cùng tổ chức (YC-M1 YC-M5)
 * - Asset đăng ký vào với `approval_state = PENDING`; engine ngoài không đặt được trạng thái duyệt
 * - `storage_key` phải khớp với tổ chức/sản phẩm/assetId của ngữ cảnh (chống ghi đè chéo)
 */
export async function registerIntegrationAsset(
  ctx: TenantContext,
  input: RegisterIntegrationAssetInput
) {
  const repo = getAssetRepository()

  // Validate parent asset exists, is APPROVED, and belongs to same product (if productId provided)
  const parentAsset = await repo.findById(ctx, input.parentAssetId)
  if (!parentAsset) throw notFound()
  if (parentAsset.approval_state !== "APPROVED") {
    throw validationFailed({ parent_asset_id: "Asset cha phải ở trạng thái APPROVED" })
  }
  if (input.productId && parentAsset.product_id !== input.productId) {
    throw validationFailed({ product_id: "Asset cha không thuộc sản phẩm này" })
  }

  // Validate storage key matches context (prevents cross-org path forging)
  if (!storageKeyMatchesContext(input.storageKey, {
    organizationId: ctx.organizationId,
    productId: input.productId,
    assetId: input.assetId,
    mimeType: input.mimeType,
  })) {
    throw validationFailed({
      storage_key: "Không khớp đường dẫn đã ký cho tổ chức này",
    })
  }

  // Register asset - will be created with approval_state = PENDING (default in schema)
  return registerAsset(ctx, {
    assetId: input.assetId,
    productId: input.productId,
    parentAssetId: input.parentAssetId,
    kind: input.kind,
    storageKey: input.storageKey,
    mimeType: input.mimeType,
    width: input.width ?? null,
    height: input.height ?? null,
    aspectRatio: input.aspectRatio ?? null,
    fileSize: input.fileSize ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    modelVersion: input.modelVersion ?? null,
    pipelineVersion: input.pipelineVersion ?? null,
    parameters: input.parameters ?? null,
    prompt: input.prompt ?? null,
    outputSha256: input.outputSha256 ?? null,
    qualityScore: input.qualityScore ?? null,
    identityScore: input.identityScore ?? null,
    generatedFlags: input.generatedFlags ?? null,
    costUsd: input.costUsd ?? null,
  })
}