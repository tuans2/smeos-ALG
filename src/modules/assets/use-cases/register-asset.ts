import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import {
  isValidGeneratedFlags,
  nextVersion,
  requiresExplicitGeneratedFlags,
} from "@/modules/assets/domain/asset-rules"
import { storageKeyMatchesContext } from "@/modules/assets/domain/storage-key"
import type { IAssetRepository } from "../domain/repositories/asset-repository.interface"
import { getAssetRepository } from "../infra/asset-repository"
import type { asset_kind } from "@/modules/assets/infra/entities"

export type RegisterAssetInput = {
  assetId: string
  productId: string | null
  parentAssetId: string | null
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
 * `POST /assets` (`G2`, đặc tả 06 mục 6) — ghi nhận asset sau khi client tải
 * xong lên URL ký sẵn. `YC-A1` `YC-A2` `YC-A3`: asset gốc bất biến, dẫn xuất
 * là bản ghi mới nối bằng `parent_asset_id`/`version`. `YC-A5`:
 * `generated_flags` bắt buộc tường minh cho asset dẫn xuất, từ chối ngay ở
 * đây nếu thiếu — không suy ra giá trị mặc định.
 */
export async function registerAsset(
  ctx: TenantContext,
  input: RegisterAssetInput,
  repo: IAssetRepository = getAssetRepository()
) {

  if (
    !storageKeyMatchesContext(input.storageKey, {
      organizationId: ctx.organizationId,
      productId: input.productId,
      assetId: input.assetId,
      mimeType: input.mimeType,
    })
  ) {
    throw validationFailed({
      storage_key:
        "Không khớp đường dẫn đã ký cho tổ chức này — dùng đúng giá trị POST /assets/upload-url trả về",
    })
  }

  let parentVersion: number | null = null
  if (input.parentAssetId) {
    const parent = await repo.findById(ctx, input.parentAssetId)
    if (!parent) throw notFound()
    parentVersion = parent.version
  }

  if (requiresExplicitGeneratedFlags({ kind: input.kind, parentAssetId: input.parentAssetId })) {
    if (!isValidGeneratedFlags(input.generatedFlags ?? null)) {
      throw validationFailed({
        generated_flags:
          "Bắt buộc tường minh cho asset dẫn xuất — { generative_fill_used, requires_reshoot_warning } (YC-A5)",
      })
    }
  }

  return repo.create(ctx, {
    id: input.assetId,
    productId: input.productId,
    parentAssetId: input.parentAssetId,
    kind: input.kind,
    version: nextVersion(parentVersion),
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
    createdBy: ctx.userId,
  })
}
