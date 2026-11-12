import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { registerAsset } from "@/modules/assets/use-cases/register-asset"
import { listAssets } from "@/modules/assets/use-cases/list-assets"
import { registerAssetBodySchema } from "@/modules/creative-production/contracts/stage-01-bring"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 01 — nguồn chuẩn ở `contracts/stage-01-bring.ts`. */
const schema = registerAssetBodySchema

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw validationFailed({ limit: "Phải là số nguyên" })
    }

    const result = await listAssets(ctx, {
      productId: url.searchParams.get("product_id") ?? undefined,
      kind: url.searchParams.get("kind") ?? undefined,
      approvalState: url.searchParams.get("approval_state") ?? undefined,
      parentAssetId: url.searchParams.get("parent_asset_id") ?? undefined,
      limit,
      cursor: url.searchParams.get("cursor"),
    })
    return jsonResponse(result)
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "G2" },
  handler: async ({ request, ctx }) => {
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const data = parsed.data

    const asset = await registerAsset(ctx, {
      assetId: data.asset_id,
      productId: data.product_id ?? null,
      parentAssetId: data.parent_asset_id ?? null,
      kind: data.kind,
      storageKey: data.storage_key,
      mimeType: data.mime_type,
      width: data.width ?? null,
      height: data.height ?? null,
      aspectRatio: data.aspect_ratio ?? null,
      fileSize: data.file_size ?? null,
      provider: data.provider ?? null,
      model: data.model ?? null,
      modelVersion: data.model_version ?? null,
      pipelineVersion: data.pipeline_version ?? null,
      parameters: data.parameters ?? null,
      prompt: data.prompt ?? null,
      outputSha256: data.output_sha256 ?? null,
      qualityScore: data.quality_score ?? null,
      identityScore: data.identity_score ?? null,
      generatedFlags: data.generated_flags ?? null,
      costUsd: data.cost_usd ?? null,
    })
    return jsonResponse({ asset }, { status: 201 })
  },
})
