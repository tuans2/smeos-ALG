import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import {
  requireIntegrationContext,
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { registerIntegrationAsset } from "@/modules/integration/use-cases/register-asset"
import { registerAssetBody } from "@/modules/integration/contracts/http-requests"

/**
 * `POST /integration/assets` (đặc tả 06 mục 11, đặc tả 08 mục 4): "Đăng ký asset dẫn xuất".
 * - Bắt buộc `parent_asset_id` trỏ asset `APPROVED` cùng tổ chức (YC-M1 YC-M5)
 * - Asset đăng ký vào với `approval_state = PENDING`; engine ngoài không đặt được trạng thái duyệt
 * - `storage_key` phải khớp tổ chức/sản phẩm/assetId
 */
export const POST = handle(async (request) => {
  const ic = await requireIntegrationContext(request)
  const ctx = await toTenantContext(ic)

  const parsed = registerAssetBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const asset = await registerIntegrationAsset(ctx, {
    assetId: parsed.data.asset_id,
    productId: parsed.data.product_id ?? null,
    parentAssetId: parsed.data.parent_asset_id,
    kind: parsed.data.kind,
    storageKey: parsed.data.storage_key,
    mimeType: parsed.data.mime_type,
    width: parsed.data.width ?? null,
    height: parsed.data.height ?? null,
    aspectRatio: parsed.data.aspect_ratio ?? null,
    fileSize: parsed.data.file_size ?? null,
    provider: parsed.data.provider ?? null,
    model: parsed.data.model ?? null,
    modelVersion: parsed.data.model_version ?? null,
    pipelineVersion: parsed.data.pipeline_version ?? null,
    parameters: parsed.data.parameters ?? null,
    prompt: parsed.data.prompt ?? null,
    outputSha256: parsed.data.output_sha256 ?? null,
    qualityScore: parsed.data.quality_score ?? null,
    identityScore: parsed.data.identity_score ?? null,
    generatedFlags: parsed.data.generated_flags ?? null,
    costUsd: parsed.data.cost_usd ?? null,
  })

  return jsonResponse(asset, { status: 201 })
})