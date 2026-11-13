import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { isExplicitLocalEngine, optimizationPriceKey } from "@/modules/media/domain/optimization-rules"
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"

export const MEDIA_OPTIMIZE_FEATURE = "media.optimize"

export type RequestOptimizationInput = {
  assetId: string
  config?: Record<string, unknown> | undefined
  idempotencyKey: string
}

/**
 * `POST /media/optimizations` (`I1`, đặc tả 06 mục 8). Tái dùng nguyên
 * `enqueueJob` của P3 — cùng đường hạn mức, cùng giao dịch, cùng
 * `Idempotency-Key`. Không có đường tắt riêng cho M04a.
 *
 * Kiểm asset TRƯỚC khi vào hàng đợi: một job trỏ vào asset của tổ chức khác
 * (hoặc không tồn tại) sẽ chạy tới worker rồi mới `FAILED`, trong khi credit
 * đã bị trừ ở bước enqueue. Chặn ở đây là chặn trước khi tính tiền.
 */
export async function requestOptimization(
  ctx: TenantContext,
  input: RequestOptimizationInput
) {
  const asset = await getAssetRepository().findById(ctx, input.assetId)
  if (!asset) throw notFound()

  // PO 25/09/2026: nhà cung cấp trước. Trừ khi người dùng chọn đích danh bộ máy
  // cục bộ, gửi worker thứ tự thử (bên chọn cho lượt → thứ tự tiệm → mặc định);
  // worker lùi Studio cục bộ khi mọi bên lỗi và core hoàn phần chênh.
  const cfg = { ...(input.config ?? {}) }
  if (isExplicitLocalEngine(cfg.enhancer_provider)) {
    cfg.engine = "local_studio"
    delete cfg.provider_order
  } else {
    const requested = typeof cfg.enhancer_provider === "string" && cfg.enhancer_provider !== "auto" ? cfg.enhancer_provider : null
    cfg.provider_order = await providerOrderFor(ctx, "image_optimize", requested)
    cfg.engine = "cloud_provider"
  }

  return enqueueJob(ctx, {
    feature: MEDIA_OPTIMIZE_FEATURE,
    productId: asset.product_id,
    payload: { asset_id: input.assetId, config: cfg },
    idempotencyKey: input.idempotencyKey,
    costCredit: costCreditForFeature(optimizationPriceKey(cfg)),
  })
}
