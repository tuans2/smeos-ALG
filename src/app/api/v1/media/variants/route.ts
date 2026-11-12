import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import type { NarrativeSceneIndex } from "@/modules/media/domain/variant-rules"
import { mediaVariantBodySchema } from "@/modules/creative-production/contracts/stage-06c-media"
import { listPendingVariants } from "@/modules/media/use-cases/list-pending-variants"
import { requestCloudVariant, requestVariants } from "@/modules/media/use-cases/request-variants"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 06c — nguồn chuẩn ở `contracts/stage-06c-media.ts`. */
const postSchema = mediaVariantBodySchema

/**
 * `POST /media/variants` (`I4`) — M04b, dựng biến thể marketing.
 *
 * CẢ HAI nhánh đi qua `enqueueJob` (23/09/2026): `local_studio` → feature
 * `media.variant`, `cloud_provider` → feature `media.variant.cloud`. Không nhánh
 * nào chạy mô hình trong request HTTP. Kết quả đọc qua `GET /media/variants/:id`.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I4" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) {
      throw validationFailed({ "idempotency-key": "Bắt buộc trên mọi endpoint tạo job (YC-U7)" })
    }

    const parsed = postSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const data = parsed.data

    const common = {
      masterAssetId: data.master_asset_id,
      preset: data.preset,
      ratio: data.ratio,
      watermark: data.watermark,
      autoEnhance: data.auto_enhance,
      idempotencyKey,
      sceneIndex: data.scene_index as NarrativeSceneIndex | undefined,
      scenePlanId: data.scene_plan_id,
      scenePlanRevision: data.scene_plan_revision,
      // Chỉ đạo khung hình (Đợt 1 nâng cấp chất lượng, 24/09/2026) — thiếu thì use-case lấy từ kịch bản.
      direction: {
        fillMode: data.fill_mode,
        composition: data.composition,
        lighting: data.lighting,
        palette: data.palette,
        seed: data.seed,
        style: data.style,
      },
      // Đợt 2 (25/09/2026): n phương án = n job con cùng job_group_id.
      variantCount: data.variant_count,
      // Đợt 3 (25/09/2026): chất lượng / tăng nét / cách ghép — quyết định cả giá.
      render: { quality: data.quality, upscale: data.upscale, composeMode: data.compose_mode },
    }

    const result =
      data.engine === "cloud_provider"
        ? await requestCloudVariant(ctx, {
            ...common,
            ...(data.provider_key ? { provider: data.provider_key } : {}),
            scenePrompt: data.scene_prompt,
          })
        : await requestVariants(ctx, common)

    return jsonResponse(
      {
        job_id: result.job.id,
        status: result.job.status,
        engine: data.engine,
        deduped: result.deduped,
        usage: { cost_credit: result.usage.costCredit, balance_after: result.usage.balanceAfter },
        job_group_id: result.jobGroupId,
        candidates: result.candidates.map((c) => ({
          index: c.index,
          job_id: c.result.job.id,
          status: c.result.job.status,
          deduped: c.result.deduped,
          cost_credit: c.result.usage.costCredit,
        })),
      },
      { status: 201 }
    )
  },
})

/** `GET /media/variants` (`I5`) — hàng chờ duyệt biến thể. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I5" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw validationFailed({ limit: "Phải là số nguyên" })
    }

    return jsonResponse(await listPendingVariants(ctx, { limit }))
  },
})
