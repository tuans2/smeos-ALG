/**
 * Use-case: Phân tích Product Intelligence từ ảnh và thông số sản phẩm.
 * Tuân thủ Clean Architecture — Phụ thuộc Domain, kiểm tra Tenant Isolation.
 * Thực hiện mắc xích đồng bộ: Output Vision -> Keyword Synthesizer -> Query Real Trends -> 10 Topics.
 *
 * CẬP NHẬT 21/09/2026 (trả nợ #113 + #115, chốt bởi Tony):
 * - Trước khi đối soát, truy vấn tín hiệu THẬT theo từng thuộc tính (màu/hoa/phong
 *   cách/đóng gói/dịp) từ bảng trend_signals thật (đa nền tảng) — dùng cả từ khóa thuộc
 *   tính thô lẫn cụm từ khóa đã tổng hợp (synthesizeProductResearchQueries, trước đây tính
 *   ra nhưng không hề được dùng tới) để tăng khả năng khớp được dữ liệu thật đã thu thập.
 * - Sau khi có báo cáo, LƯU LẠI lượt phân tích vào product_analysis_runs (trước đây chạy
 *   xong là mất, không có lịch sử) — lưu an toàn (try/catch), không làm hỏng luồng chính
 *   nếu ghi DB thất bại hoặc môi trường test không có Postgres thật.
 *
 * CẬP NHẬT 22/09/2026 (trả nợ #118 — sửa Chặng 05 CHOOSE gãy vì Data URL trong query string):
 * - `assetId` chuyển BẮT BUỘC, kiểm ngay (thuần, không đợi DB) cùng nhóm với
 *   components/attributes/packaging/context/productName — ảnh chưa lưu vào
 *   kho thì không có gì để bàn giao sang Creative Studio một cách an toàn.
 * - `report.imageUrl` KHÔNG còn giữ Data URL base64 của client khi ghi DB:
 *   sau khi có báo cáo, tra `assets` bằng `assetId` để lấy `storage_key`
 *   thật rồi ký lại URL hiển thị (best-effort — DB lỗi thì vẫn trả report,
 *   chỉ là không ghi được lịch sử) — không bao giờ ghi base64 vào
 *   `product_analysis_runs.report` (JSONB), dù resolve thành công hay không.
 */

import type { IMarketIntelligenceRepository } from "../domain/repositories/market-intelligence-repository.interface";
import { getMarketIntelligenceRepository } from "../infra/market-intelligence-repository";
import {
  evaluateProductTrendFit,
  deriveProductKeyAttributes,
  type RealTrendSignalInput,
  type RealAttributeSignal,
  type RealAttributeSignals,
} from "../domain/trend-fit";
import { synthesizeProductResearchQueries } from "../domain/synthesize-product-queries";
import { AppError } from "@/core/http/errors";
import { getAssetRepository } from "@/modules/assets/infra/asset-repository";
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface";
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory";
import { ASSET_VIEW_URL_TTL_SECONDS } from "@/modules/assets/use-cases/get-asset-view-url";
import type {
  ProductFlowerComponent,
  ProductVisualAttributes,
  ProductPackaging,
  ProductInferredContext,
  ProductIntelligenceReport,
  CommercialPassport,
} from "../domain/product-intelligence-types";

export interface AnalyzeProductIntelligenceParams {
  organizationId: string;
  productName: string;
  imageUrl: string;
  /** BẮT BUỘC từ 22/09/2026 (nợ #118) — ảnh phải đã lưu vào kho (`assets`). */
  assetId: string;
  components?: ProductFlowerComponent[] | undefined;
  attributes?: ProductVisualAttributes[] | ProductVisualAttributes | undefined;
  packaging?: ProductPackaging | undefined;
  context?: ProductInferredContext | undefined;
  commercialPassport?: CommercialPassport | undefined;
}

const TREND_SIGNAL_PLATFORM_LABELS: Record<string, string> = {
  google_trends: "Google Trends",
  google_trends_serpapi: "SerpApi",
  tiktok_trends: "TikTok",
  youtube_trends: "YouTube",
};

/**
 * Tra một danh sách từ khóa ứng viên (theo thứ tự ưu tiên) tới khi tìm được tín hiệu
 * trend_signals thật đầu tiên — không tìm thấy candidate nào trả về null (trung thực,
 * không bịa). Bọc try/catch riêng từng candidate để một lỗi DB không chặn cả pipeline.
 */
async function lookupRealAttributeSignal(
  candidates: (string | undefined)[],
  repo: IMarketIntelligenceRepository = getMarketIntelligenceRepository()
): Promise<RealAttributeSignal | null> {
  for (const raw of candidates) {
    const keyword = raw?.trim();
    if (!keyword) continue;
    try {
      const rows = await repo.findCachedSignalsAnyPlatform(keyword);
      const top = rows[0];
      if (top) {
        return {
          metricValue: top.metric_value,
          growthRate: top.growth_rate ?? null,
          confidence: top.confidence,
          capturedAt: top.captured_at.toISOString(),
          platformLabel: TREND_SIGNAL_PLATFORM_LABELS[top.platform] ?? top.platform,
        };
      }
    } catch {
      // Dự phòng an toàn — bỏ qua, thử candidate tiếp theo (không chặn pipeline)
    }
  }
  return null;
}

/**
 * Thiếu đầu vào bắt buộc của Chặng 03 → 400 `details.<trường>` (audit API §22 — trước đây `Error` trần → 500).
 */
function missingInput(field: string, message: string): AppError {
  return new AppError("VALIDATION_FAILED", message, { [field]: message })
}

export async function analyzeProductIntelligence(
  params: AnalyzeProductIntelligenceParams,
  repo: IMarketIntelligenceRepository = getMarketIntelligenceRepository(),
  assetRepo: IAssetRepository = getAssetRepository()
): Promise<ProductIntelligenceReport> {
  // BẮT BUỘC: Vision AI (Chặng 02 UNDERSTAND) phải trả dữ liệu thật, không fallback cứng
  if (!params.components || params.components.length === 0) {
    throw missingInput("components", "Thiếu components — Vision AI chưa bóc tách thành phần hoa. " +
      "Hãy chạy Chặng 02 UNDERSTAND (analyzeProductVision) trước.");
  }
  const components = params.components;

  const rawAttributes = Array.isArray(params.attributes) ? params.attributes[0] : params.attributes;
  if (!rawAttributes) {
    throw missingInput("attributes", "Thiếu attributes — Vision AI chưa trả thuộc tính thị giác.");
  }
  const attributes: ProductVisualAttributes = rawAttributes;

  if (!params.packaging) {
    throw missingInput("packaging", "Thiếu packaging — Vision AI chưa trả thông tin đóng gói.");
  }
  const packaging: ProductPackaging = params.packaging;

  if (!params.context) {
    throw missingInput("context", "Thiếu context — Vision AI chưa trả ngữ cảnh sản phẩm.");
  }
  const context: ProductInferredContext = params.context;

  if (!params.productName) {
    throw missingInput("product_name", "Thiếu productName — Vision AI chưa trả tên sản phẩm.");
  }

  if (!params.assetId || !params.assetId.trim()) {
    throw missingInput("asset_id", "Thiếu assetId — ảnh chưa được lưu vào kho ảnh " +
      "(chặn cứng từ 22/09/2026, nợ #118). Tải ảnh qua /api/v1/assets/upload-url trước.");
  }

  // MẮC XÍCH ĐỒNG BỘ: Sinh từ khóa có chủ đích từ Vision output
  const synthesized = synthesizeProductResearchQueries({
    productName: params.productName,
    components,
    attributes,
    packaging,
    context,
  });

  const keyAttrs = deriveProductKeyAttributes({ components, attributes, packaging, context });

  // Truy vấn các tín hiệu THẬT theo từng thuộc tính từ trend_signals (nợ #115, chốt 21/09/2026)
  // — thử từ khóa thuộc tính thô trước, rồi tới cụm từ khóa đã tổng hợp (synthesized) để tăng
  // khả năng khớp được dữ liệu thật đã thu thập qua "Quét theo từ khóa".
  const [colorSignal, flowerSignal, styleSignal, packagingSignal, occasionSignal] = await Promise.all([
    lookupRealAttributeSignal([keyAttrs.mainColor, synthesized.flowerColorQuery], repo),
    lookupRealAttributeSignal([keyAttrs.dominantFlower, synthesized.flowerColorQuery], repo),
    lookupRealAttributeSignal([keyAttrs.primaryStyle, synthesized.styleQuery], repo),
    lookupRealAttributeSignal([keyAttrs.packagingMaterial, synthesized.packagingQuery], repo),
    lookupRealAttributeSignal([keyAttrs.primaryOccasion, synthesized.occasionQuery], repo),
  ]);

  const realAttributeSignals: RealAttributeSignals = {
    color: colorSignal,
    dominantFlower: flowerSignal,
    style: styleSignal,
    packaging: packagingSignal,
    occasion: occasionSignal,
  };

  // Truy vấn các tín hiệu thực tế trong CSDL của tổ chức (Tenant Isolation qua Repository)
  // — dùng làm dẫn chứng cấp chủ đề (cụ thể/cá nhân hóa hơn), ưu tiên trước tín hiệu thô ở trên.
  let realSignals: RealTrendSignalInput[] = [];
  try {
    const opps = await repo.findTenantOpportunities(params.organizationId, 10);

    realSignals = opps.map((o) => ({
      topicName: o.topic?.canonical_name ?? "Chủ đề",
      trendScore: o.trend_score,
      viralScore: o.viral_score,
      commercialScore: o.commercial_score,
      summary: o.opportunity_summary,
      marketSignal: `Tương tác cao trên nền tảng (Cơ hội nội dung ${Math.round(o.content_opportunity_score)}/100)`,
    }));
  } catch {
    // Dự phòng an toàn nếu CSDL chưa nạp opportunities
  }

  // Nếu chưa có opportunities riêng của tenant, tra cứu bảng topics chung
  if (realSignals.length === 0) {
    try {
      const topTopics = await repo.findTopTopics(10);

      realSignals = topTopics.map((t) => ({
        topicName: t.canonical_name,
        trendScore: t.scores?.[0]?.trend_score ?? 70,
        viralScore: t.scores?.[0]?.viral_score ?? 65,
        summary: typeof t.description === "string" ? t.description : undefined,
        marketSignal: `Chủ đề thịnh hành trên thị trường (${t.status ?? ""})`,
      }));
    } catch {
      // Dự phòng an toàn
    }
  }

  const report = evaluateProductTrendFit({
    productName: params.productName,
    imageUrl: params.imageUrl,
    components,
    attributes,
    packaging,
    context,
    commercialPassport: params.commercialPassport,
    realTrendSignals: realSignals,
    realAttributeSignals,
  });

  // Tra asset thật để ký lại URL hiển thị — thay cho Data URL base64 mà client gửi lên
  // (nợ #118). Best-effort: DB/kho lỗi thì report vẫn trả về nguyên vẹn cho người dùng
  // (imageUrl giữ giá trị client gửi, hợp lệ để hiển thị ngay lập tức trong phiên này),
  // chỉ riêng bản GHI XUỐNG DB (bên dưới) là không bao giờ chứa base64.
  let resolvedImageUrl: string | null = null;
  try {
    const asset = await assetRepo.findByOrganizationId(params.organizationId, params.assetId);
    if (asset) {
      resolvedImageUrl = await getStorageProvider().signedUrl(asset.storage_key, ASSET_VIEW_URL_TTL_SECONDS, "GET");
      report.imageUrl = resolvedImageUrl;
    }
  } catch (err) {
    console.warn("[analyzeProductIntelligence] Không ký lại được URL ảnh từ assetId:", err);
  }

  // LƯU LẠI lượt phân tích (nợ #113, chốt 21/09/2026: "Phải lưu giữ") — an toàn, không
  // chặn phản hồi cho người dùng nếu ghi DB thất bại (vd. môi trường test không có Postgres).
  // `report.id` được GHI ĐÈ bằng id thật của dòng vừa lưu — từ nay đây CHÍNH LÀ "run id"
  // mà Chặng 05 CHOOSE dùng để tra lại report qua GET /api/v1/product-intelligence/:id
  // (không còn cần sessionStorage — xem `build-handoff-url.ts`).
  try {
    const persistedReport = { ...report, imageUrl: resolvedImageUrl ?? "" };
    const run = await repo.createProductAnalysisRun({
      organizationId: params.organizationId,
      assetId: params.assetId,
      productName: report.productName,
      trendFitScore: report.trendFitScore,
      audienceFitScore: report.audienceFitScore,
      contentFitScore: report.contentFitScore,
      overallFit: report.overallFit,
      report: persistedReport,
    });
    report.id = run.id;
  } catch (err) {
    console.warn("[analyzeProductIntelligence] Không lưu được lịch sử phân tích (product_analysis_runs):", err);
  }

  return report;
}
