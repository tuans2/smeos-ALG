/**
 * Use-case: Bóc tách cấu trúc thị giác hoa từ ảnh (Vision AI Extraction) cho Market Intelligence.
 * Tuân thủ Clean Architecture — Phụ thuộc Domain, kiểm tra Tenant Isolation.
 */

import { log } from "@/core/observability/log";
import { AppError, notFound } from "@/core/http/errors";
import type { TenantContext } from "@/core/tenancy";
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory";
import { getAssetRepository } from "@/modules/assets/infra/asset-repository";
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface";
import type { IGenerationJobRepository } from "@/modules/jobs/domain/repositories/generation-job-repository.interface";
import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository";
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job";
import { refundJob } from "@/modules/usage/use-cases/refund-job";
import { aiFailureMessage } from "@/modules/usage/domain/ai-failure-message";

import type { IMarketIntelligenceRepository } from "../domain/repositories/market-intelligence-repository.interface";
import { getMarketIntelligenceRepository } from "../infra/market-intelligence-repository";
import { callCapability } from "@/core/ai/gateway";
import { aiGatewayDeps } from "@/core/ai/wiring";
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider";
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences";
import { createProductVisionAdapter } from "../adapters/product-vision-ai-adapter";
import type { IOrganizationRepository } from "@/modules/organization/domain/repositories/organization-repository.interface";
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository";
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile";
import type {
  ProductFlowerComponent,
  ProductVisualAttributes,
  ProductPackaging,
  ProductInferredContext,
} from "../domain/product-intelligence-types";

export interface AnalyzeProductVisionInput {
  assetId: string;
  productTitle?: string | undefined;
  /** Có = người dùng đã xác nhận phân tích lại (trả phí): bỏ qua kết quả cũ. */
  reanalyzeKey?: string | undefined;
}

export interface AnalyzeProductVisionOutput {
  productName: string;
  imageUrl: string;
  assetId?: string | undefined;
  components: ProductFlowerComponent[];
  attributes: ProductVisualAttributes;
  packaging: ProductPackaging;
  context: ProductInferredContext;
  /** `vision_ai` = mô hình vừa đọc ảnh · `m01` = kết quả M01 đã lưu (không thu credit). */
  source?: "vision_ai" | "m01";
  /** true = kết quả cũ của chính ảnh này, không gọi mô hình, không thu credit. */
  reused?: boolean;
}

/** Kết quả use-case = đầu ra hợp đồng + mức credit vừa thu (route đổi sang `usage` snake_case). */
export type AnalyzeProductVisionResult = AnalyzeProductVisionOutput & {
  usage?: { costCredit: number; balanceAfter: number | null };
}

/** Khoá giá + feature riêng — KHÔNG dùng `vision.analyze` vì worker M01 nghe feature đó và sẽ nhận nhầm job. */
export const PRODUCT_VISION_EXTRACT_FEATURE = "product.vision_extract";
const PREVIEW_TTL_SECONDS = 3600;
const MAX_DEDUPE_CHAIN = 5;

/**
 * Chặng 02 UNDERSTAND (`POST /market-intelligence/vision-extract`, `V1`).
 *
 * 25/09/2026 (rà soát thương mại): trước ngày này mỗi lần bấm "Bóc tách" gọi
 * OpenAI Vision (`gpt-4o-mini`, `detail: high`) KHÔNG trừ credit, không vào sổ
 * `usage`, và gửi nguyên `image_url` do trình duyệt đưa lên (kể cả URL ngoài).
 * Nay: ảnh đọc từ KHO theo `asset_id` của đúng tổ chức; lượt gọi mô hình đi
 * qua `enqueueJob` (feature `product.vision_extract`, 1 credit) theo khuôn chạy
 * tại chỗ của `generate-scene-plan.ts`; cùng một ảnh bấm lại trả kết quả cũ,
 * không thu lần hai; mô hình không đọc được → job FAILED + hoàn credit.
 */
export async function analyzeProductVision(
  ctx: TenantContext,
  input: AnalyzeProductVisionInput,
  repo: IMarketIntelligenceRepository = getMarketIntelligenceRepository(),
  assetRepo: IAssetRepository = getAssetRepository(),
  jobRepo: IGenerationJobRepository = getGenerationJobRepository(),
  orgRepo: IOrganizationRepository = getOrganizationRepository()
): Promise<AnalyzeProductVisionResult> {
  const { assetId, productTitle, reanalyzeKey } = input;
  const asset = await assetRepo.findById(ctx, assetId);
  if (!asset) throw notFound();
  const storage = getStorageProvider();
  const imageUrl = await storage.signedUrl(asset.storage_key, PREVIEW_TTL_SECONDS);

  // 1. Kết quả M01 đã có của đúng ảnh này → dùng lại, không gọi mô hình, không thu.
  const existingAnalysis = await repo.findProductAnalysis(ctx.organizationId, assetId);
  if (existingAnalysis && !reanalyzeKey) {
    const data = (existingAnalysis.edited || existingAnalysis.raw) as RawVisionAnalysis;
    return { ...mapAnalysisToProductIntelligence(data, imageUrl, assetId, productTitle), source: "m01", reused: true };
  }

  // 2. Một lượt gọi mô hình = một job trong sổ. Lượt trước hỏng (đã hoàn credit)
  //    thì nối khoá mới để người dùng thử lại được.
  let key = reanalyzeKey ? `vision-extract:${assetId}:again:${reanalyzeKey}` : `vision-extract:${assetId}`;
  let enq = await enqueueJob(ctx, { feature: PRODUCT_VISION_EXTRACT_FEATURE, payload: { asset_id: assetId }, productId: asset.product_id, idempotencyKey: key });
  for (let i = 0; enq.deduped && (enq.job.status === "FAILED" || enq.job.status === "CANCELLED") && i < MAX_DEDUPE_CHAIN; i++) {
    key = `vision-extract:${assetId}:after:${enq.job.id}`;
    enq = await enqueueJob(ctx, { feature: PRODUCT_VISION_EXTRACT_FEATURE, payload: { asset_id: assetId }, productId: asset.product_id, idempotencyKey: key });
  }
  if (enq.deduped) {
    const cached = enq.job.output as Omit<AnalyzeProductVisionOutput, "imageUrl"> | null;
    if (enq.job.status === "COMPLETED" && cached) return { ...cached, imageUrl, assetId, source: "vision_ai", reused: true, usage: enq.usage };
    throw new AppError("CONFLICT", "Ảnh này đang được Vision AI bóc tách — chờ vài giây rồi thử lại.");
  }

  await jobRepo.startInline(ctx, enq.job.id, new Date());
  try {
    const bytes = await storage.get(asset.storage_key);
    const org = await orgRepo.current(ctx);
    const orgSettings = (org?.settings as Record<string, unknown>) || {};
    const industryKey = typeof orgSettings.industry === "string" ? orgSettings.industry : "FLORAL";
    const industryPlugin = getIndustryPlugin(industryKey);

    // Qua cổng AI (nợ #155): nhà cung cấp theo thứ tự ưu tiên của tiệm, bên hỏng
    // thì sang bên kế tiếp; `ai_requests` ghi mô hình, chi phí, độ trễ từng lượt.
    const aiResult = await callCapability(
      {
        capability: "product_vision",
        privacy: "SHOP",
        entity: { type: "product_vision_extract", id: enq.job.id },
        jobId: enq.job.id,
        preferredModelKeys: await providerOrderFor(ctx, "content"),
      },
      createProductVisionAdapter(
        createContentLLM(),
        {
          image: { mimeType: asset.mime_type || "image/jpeg", base64: Buffer.from(bytes).toString("base64") },
          productTitle,
          industryPlugin,
        },
        ctx.organizationId
      ),
      aiGatewayDeps(ctx)
    );
    if (aiResult.kind !== "xong") throw new Error(`Không nhà cung cấp nào đọc được ảnh (${aiResult.reason}).`);
    const ai = aiResult.output;
    const output = {
      productName: ai.productName,
      components: ai.components,
      attributes: ai.attributes,
      packaging: ai.packaging,
      context: ai.context,
    };
    await jobRepo.finishInline(ctx, enq.job.id, { ok: true, now: new Date(), output });
    return { ...output, imageUrl, assetId, source: "vision_ai", usage: enq.usage };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định";
    await jobRepo.finishInline(ctx, enq.job.id, { ok: false, error: message, now: new Date() });
    const refunded = (await refundJob(ctx, enq.job.id).catch(() => null))?.refunded === true;
    // Chi tiết (vd. khoá kho `org/<id>/…` khi thiếu tệp) chỉ vào log, không trả ra client (audit API §22, BL-33)
    log.error("market_intel.vision_extract_failed", { job_id: enq.job.id, reason: message });
    throw new AppError("INTERNAL", aiFailureMessage("AI chưa nhận diện được ảnh", refunded));
  }
}

/** Một dòng hoa/lá trong kết quả M01 đã lưu (JSON, chưa kiểm dạng). */
interface RawVisionRow {
  name?: string;
  loai_hoa?: string;
  loai_la?: string;
  count?: string | number;
  so_luong?: string | number;
}

/** Các trường của kết quả M01 (`product_analyses.edited ?? raw`) mà hàm ánh xạ đọc. */
interface RawVisionAnalysis {
  flowers?: RawVisionRow[];
  foliage?: RawVisionRow[];
  palette_accounting?: { dominant_colors?: string[] };
  phong_cach?: string;
  shape?: string;
  size?: string;
  wrapping?: { material?: string; color?: string };
  accessories?: { ribbon?: string; card?: unknown };
  dip_su_dung?: string[];
  suggested_price?: string | number;
  confidence?: number;
  product_name?: string;
}

function mapAnalysisToProductIntelligence(
  raw: RawVisionAnalysis,
  imageUrl: string,
  assetId?: string,
  productTitle?: string
): AnalyzeProductVisionOutput {
  const rawFlowers = Array.isArray(raw.flowers) ? raw.flowers : [];
  const rawFoliage = Array.isArray(raw.foliage) ? raw.foliage : [];
  const rawPalette = raw.palette_accounting?.dominant_colors || [];

  const components: ProductFlowerComponent[] = [];

  rawFlowers.forEach((f: RawVisionRow, idx: number) => {
    components.push({
      flowerType: f.name || f.loai_hoa || `Thành phần #${idx + 1}`,
      quantityEstimate: parseInt(String(f.count || f.so_luong)) || 0,
      unit: "cành",
      role: idx === 0 ? "dominant" : "supporting",
    });
  });

  rawFoliage.forEach((fol: RawVisionRow) => {
    components.push({
      flowerType: fol.name || fol.loai_la || "Lá phụ trang trí",
      quantityEstimate: parseInt(String(fol.count || fol.so_luong)) || 0,
      unit: "cành",
      role: "foliage",
    });
  });

  if (components.length === 0) {
    throw new Error(
      "[analyzeProductVision] Vision data trong DB trống — không chứa thành phần hoa (flowers/foliage). " +
      "Không thể tạo Product Intelligence report mà không có dữ liệu bóc tách thật."
    );
  }

  const attributes: ProductVisualAttributes = {
    mainColors: rawPalette.slice(0, 2),
    secondaryColors: rawPalette.slice(2, 4),
    style: raw.phong_cach || "",
    shape: raw.shape || "",
    sizeEstimate: raw.size || "",
  };

  const packaging: ProductPackaging = {
    wrappingMaterial: raw.wrapping?.material || "",
    wrappingColor: raw.wrapping?.color || "",
    ribbon: raw.accessories?.ribbon || "",
    accessories: raw.accessories?.card ? ["Thiệp chúc mừng"] : [],
  };

  const occasions = Array.isArray(raw.dip_su_dung) && raw.dip_su_dung.length > 0
    ? raw.dip_su_dung
    : [];

  const context: ProductInferredContext = {
    likelyOccasions: occasions,
    likelyAudience: "",
    // Giá trị M01 không có → 0/rỗng để chủ tiệm tự nhập; không bịa (AGENTS.md: số hiển thị phải là số đo).
    suggestedPrice: parseInt(String(raw.suggested_price)) || 0,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
  };

  return {
    productName: productTitle || raw.product_name || "Sản phẩm mới",
    imageUrl,
    assetId,
    components,
    attributes,
    packaging,
    context,
  };
}
