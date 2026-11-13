import { AppError } from "@/core/http/errors";
import { requireCapability } from "@/core/rbac/capabilities";
import { callCapability } from "@/core/ai/gateway";
import { aiGatewayDeps } from "@/core/ai/wiring";
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider";
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences";
import type { TenantContext } from "@/core/tenancy";

import type { IProductCopyRepository } from "../domain/repositories/product-copy-repository.interface";
import { getProductCopyRepository } from "../infra/product-copy-repository";
import type { IProductAnalysisRepository } from "@/modules/products/domain/repositories/product-analysis-repository.interface";
import { getProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository";
import type { IBrandProfileRepository } from "@/modules/profiles/domain/repositories/brand-profile-repository.interface";
import { getBrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository";
import type { IOccasionRepository } from "@/modules/organization/domain/repositories/occasion-repository.interface";
import { getOccasionRepository } from "@/modules/organization/infra/occasion-repository";
import type { IGenerationJobRepository } from "@/modules/jobs/domain/repositories/generation-job-repository.interface";
import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository";
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job";
import { refundJob } from "@/modules/usage/use-cases/refund-job";
import { parseBrandForbiddenStyles } from "@/core/ai/domain/flower-content-guard";
import { extractBrandCtaPhrase, extractBrandHashtags } from "@/modules/profiles/domain/profile-rules";

import { createProductCopyAdapter, type ProductCopyInput } from "../adapters/product-copy-adapter";
import { duDeSinhCauChu, projectAnalysisForCopy } from "../domain/analysis-projection";

export const FEATURE_SINH_CAU_CHU = "product.copy.generate" as const;

export type GenerateProductCopyInput = {
  analysisId: string;
  productId?: string | null;
  /** Bắt buộc trên mọi điểm tạo job (`YC-U7`) — bấm hai lần không tính tiền hai lần. */
  idempotencyKey: string;
};

/**
 * Sinh dữ liệu bán hàng từ một lượt phân tích ĐÃ DUYỆT — `H5` chạy, `H6` duyệt.
 *
 * Bốn điều kiện mà mọi lượt gọi mô hình trong hệ này phải thoả, và trước đợt
 * soát này bước M01b không thoả điều nào:
 *
 *   hạn mức kiểm tại điểm tạo job   → `enqueueJob` (PRD mục 7.5)
 *   một dòng `usage` cho mỗi lượt   → `enqueueJob`
 *   `idempotency_key`               → `enqueueJob` (`YC-U7`)
 *   mô hình do cổng AI chọn         → `callCapability`, không `pinnedModelKey`
 *
 * Lượt chạy hỏng thì job `FAILED` và credit hoàn theo D3-b, diện "job hỏng vì
 * lỗi kỹ thuật" — nền tảng hỏng chứ không phải khách dùng sai.
 */
export async function generateProductCopy(
  ctx: TenantContext,
  input: GenerateProductCopyInput,
  copyRepo: IProductCopyRepository = getProductCopyRepository(),
  analysisRepo: IProductAnalysisRepository = getProductAnalysisRepository(),
  brandRepo: IBrandProfileRepository = getBrandProfileRepository(),
  occasionRepo: IOccasionRepository = getOccasionRepository(),
  jobRepo: IGenerationJobRepository = getGenerationJobRepository()
): Promise<{ copyId: string; raw: unknown; needsReview: boolean; modelKey: string | null }> {
  requireCapability(ctx, "H5");

  const analysis = await analysisRepo.findById(ctx, input.analysisId);
  if (!analysis) throw new AppError("NOT_FOUND", "Phân tích không tồn tại");
  if (analysis.approval_state !== "APPROVED") {
    throw new AppError("UNPROCESSABLE_ENTITY", "Phân tích chưa được duyệt");
  }
  if (input.productId && analysis.product_id && analysis.product_id !== input.productId) {
    throw new AppError("CONFLICT", "product_id không khớp với phân tích");
  }

  // Một lượt phân tích chỉ sinh một bản copy (`@@unique([analysis_id])`).
  // Trả lại bản cũ TRƯỚC khi chạm hạn mức — không tính tiền cho một lượt
  // không gọi mô hình.
  const existing = await copyRepo.findByAnalysisId(ctx, input.analysisId);
  if (existing) {
    return { copyId: existing.id, raw: existing.raw, needsReview: false, modelKey: existing.model_key };
  }

  const hinhChieu = projectAnalysisForCopy(analysis.edited ?? analysis.raw);
  if (!duDeSinhCauChu(hinhChieu)) {
    throw new AppError("VALIDATION_FAILED", "Phân tích thiếu dữ liệu nhận dạng và định mức vật tư");
  }

  const [brandProfile, occasions] = await Promise.all([
    brandRepo.current(ctx),
    occasionRepo.list(ctx),
  ]);

  // `hashtags`/`cta_templates` là Json chưa khoá hình dạng — giao diện thật
  // (`brand-profile-form.tsx`) lưu `{ default: ... }`, không phải mảng/chuỗi
  // trần. Ép kiểu thẳng (`as string[]`) từng vỡ runtime khi `buildPrompt()`
  // gọi `.join()` trên một object — nợ #103 trong TECHNICAL_DEBT.md, sửa
  // 17/09. Đọc qua hai hàm thuần ở `profile-rules.ts`, không đoán hình dạng
  // ở đây.
  const aiPayload: ProductCopyInput = {
    analysis: hinhChieu,
    brand: {
      tone_of_voice: brandProfile?.tone_of_voice ?? null,
      hashtags: extractBrandHashtags(brandProfile?.hashtags ?? null),
      cta_templates: extractBrandCtaPhrase(brandProfile?.cta_templates ?? null),
      forbidden_styles: parseBrandForbiddenStyles(
        (brandProfile?.forbidden_styles as string | null) ?? null
      ).map((r) => r.phrase),
    },
    occasions: occasions.map((o) => ({ code: o.code, name: o.name })),
  };

  const { job } = await enqueueJob(ctx, {
    feature: FEATURE_SINH_CAU_CHU,
    payload: { analysis_id: input.analysisId, product_id: analysis.product_id ?? null },
    productId: analysis.product_id ?? null,
    idempotencyKey: input.idempotencyKey,
  });

  await jobRepo.startInline(ctx, job.id, new Date());

  try {
    const aiResult = await callCapability(
      {
        capability: "product_copy",
        privacy: "SHOP",
        entity: { type: "product_copy", id: input.analysisId },
        jobId: job.id,
        preferredModelKeys: await providerOrderFor(ctx, "content"),
      },
      createProductCopyAdapter(createContentLLM(), aiPayload, ctx.organizationId),
      aiGatewayDeps(ctx)
    );

    if (aiResult.kind !== "xong") {
      throw new AppError("INTERNAL", "AI chưa chạy được lúc này — hãy thử lại sau ít phút");
    }

    const raw = {
      ...(aiResult.output as Record<string, unknown>),
      // Phong cách do mô hình đề xuất; thiếu thì lấy lại đúng trường của hợp
      // đồng Vision, không phải một khoá tự nghĩ ra.
      suggested_style:
        (aiResult.output as Record<string, unknown>).suggested_style ??
        hinhChieu.identity.phong_cach ??
        null,
    };

    const saved = await copyRepo.createFromAnalysis(ctx, {
      analysisId: input.analysisId,
      productId: analysis.product_id ?? input.productId ?? null,
      raw,
      profileVersion: "v1",
      jobId: job.id,
      modelKey: aiResult.model.key,
      provider: aiResult.model.provider,
      costUsd: aiResult.attempts.reduce<number | null>(
        (tong, a) => (a.costUsd === undefined ? tong : (tong ?? 0) + a.costUsd),
        null
      ),
      latencyMs: aiResult.attempts.reduce<number | null>(
        (tong, a) => (a.latencyMs === undefined ? tong : (tong ?? 0) + a.latencyMs),
        null
      ),
    });

    await jobRepo.finishInline(ctx, job.id, { ok: true, now: new Date() });

    return {
      copyId: saved.id,
      raw: saved.raw,
      needsReview: aiResult.evaluation.needsReview,
      modelKey: aiResult.model.key,
    };
  } catch (error) {
    await jobRepo.finishInline(ctx, job.id, {
      ok: false,
      error: error instanceof Error ? error.message : "Lỗi không xác định",
      now: new Date(),
    });
    // D3-b diện ba: hỏng vì lỗi kỹ thuật thì hoàn credit. Không để lượt hoàn
    // nuốt mất lỗi gốc — người dùng vẫn phải thấy vì sao lượt chạy hỏng.
    await refundJob(ctx, job.id).catch(() => undefined);
    throw error;
  }
}
