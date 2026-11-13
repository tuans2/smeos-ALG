import { jsonResponse } from "@/core/http/response"
import { notFound } from "@/core/http/errors"
import { marketIntelligenceRepo } from "@/modules/market-intelligence/infra/market-intelligence-repository"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { ASSET_VIEW_URL_TTL_SECONDS } from "@/modules/assets/use-cases/get-asset-view-url"
import type {
  CommercialPassport,
  ProductFlowerComponent,
  ProductIntelligenceReport,
  ProductVisualAttributes,
  ProductPackaging,
  ProductInferredContext,
} from "@/modules/market-intelligence/domain/product-intelligence-types"
import { defineRoute } from "@/core/http/define-route"

function buildFallbackReport(
  id: string,
  productName: string,
  assetId: string,
  raw: Record<string, unknown>
): ProductIntelligenceReport {
  const identity = (raw.identity as Record<string, unknown>) || {}
  const bom = (raw.bom as Record<string, unknown>) || {}
  const palette = (raw.palette_accounting as Array<Record<string, unknown>>) || []

  const category = (identity.category as string) || ""
  const style = (identity.phong_cach as string) || ""
  const occasion = (identity.dip_su_dung as string) || ""

  const components: ProductFlowerComponent[] = []
  const colorsSet = new Set<string>()

  const addFlowerItems = (arr: unknown[], role: ProductFlowerComponent["role"]) => {
    for (const item of arr) {
      const row = item as Record<string, unknown>
      if (row?.name) {
        components.push({
          flowerType: String(row.name),
          quantityEstimate: (row.quantity as number) || 0,
          unit: (row.dvt_dem as string) || "cành",
          role,
          color: (row.color || row.mau) as string | undefined,
        })
      }
      if (row?.color) colorsSet.add(String(row.color))
      if (row?.shade) colorsSet.add(String(row.shade))
    }
  }
  addFlowerItems(Array.isArray(bom.flowers) ? bom.flowers : [], "dominant")
  addFlowerItems(Array.isArray(bom.foliage) ? bom.foliage : [], "foliage")

  const colors: string[] = []
  for (const nhom of palette) {
    const g = nhom.nhom as string | undefined
    if (g && !colors.includes(g)) colors.push(g)
  }
  for (const c of colorsSet) {
    if (!colors.includes(c)) colors.push(c)
  }

  const attributes: ProductVisualAttributes = {
    mainColors: colors.slice(0, 4),
    secondaryColors: [],
    style,
    shape: (identity.shape as string) || "",
    sizeEstimate: "",
  }

  const packaging: ProductPackaging = {
    wrappingMaterial: "",
    wrappingColor: "",
    ribbon: "",
    accessories: [],
  }

  const context: ProductInferredContext = {
    likelyOccasions: occasion ? [occasion] : [],
    likelyAudience: "",
    suggestedPrice: 0,
    confidence: 0,
  }

  const commercialPassport: CommercialPassport = {
    suggestedName: productName,
    shortHeadline: "",
    description: "",
    style,
    tags: [],
    seoKeywords: [],
    occasions: context.likelyOccasions,
    targetAudience: { recipient: "", buyerPersona: "" },
    flowerMeaningStory: "",
    keySellingPoints: [],
    cardMessageSuggestions: { romantic: "", subtle: "", congratulatory: "" },
    careInstructions: [],
    priceSegment: "standard",
    priceRange: { minPrice: 0, targetPrice: 0, maxPrice: 0 },
    recommendedUpsells: [],
  }

  return {
    id,
    productName,
    imageUrl: "",
    trendFitScore: 0,
    audienceFitScore: 0,
    contentFitScore: 0,
    overallFit: "LOW",
    components,
    attributes,
    packaging,
    context,
    commercialPassport,
    trendFitMatrix: [],
    improvements: { keep: [], improve: [], test: [] },
    topics: [],
    readiness: {
      productRecognition: components.length > 0,
      trendFit: false,
      audienceDefined: false,
      positioningDefined: false,
      visualQuality: "ACCEPTABLE",
      videoPotential: false,
    },
    createdAt: new Date().toISOString(),
  }
}

/**
 * `GET /api/v1/product-intelligence/:id` (`V2`) — tra lại một lượt phân tích
 * Product Intelligence đã lưu (Chặng 02-04) bằng `id` (= `product_analysis_runs.id`).
 *
 * Đích của route này (chốt 22/09/2026, nợ #118): thay cho việc Chặng 05 CHOOSE
 * mang cả `report` qua `sessionStorage` (mất khi F5/mở tab mới, tràn hạn mức
 * ~5MB khi report còn chứa base64) — Creative Studio giờ chỉ mang một `id`
 * ngắn qua URL rồi tự tải lại report ở đây.
 *
 * `report.imageUrl` được ký lại MỚI mỗi lần đọc từ `asset_id` của dòng lưu —
 * KHÔNG BAO GIỜ đọc một URL đã ký cũ từ DB (URL ký có hạn dùng, DB không lưu
 * URL nào cả — xem `product_analysis_runs` trong `schema.prisma`).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "V2" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const run = await marketIntelligenceRepo.getProductAnalysisRun(ctx.organizationId, id)

    // Fallback: id có thể là product_analyses.id (luồng /tai-anh)
    // — tìm kiếm trong product_analyses và dựng report từ raw data
    if (!run) {
      const analysis = await marketIntelligenceRepo.getProductAnalysisById(
        ctx.organizationId,
        id
      )
      if (analysis && analysis.raw) {
        // Tên sản phẩm đã gắn; chưa gắn sản phẩm thì tên chung — không lấy mã ảnh/UUID làm tên (audit API §32)
        const productName = (analysis as { product?: { name: string } | null }).product?.name?.trim() || "Sản phẩm chưa đặt tên"
        const report = buildFallbackReport(id, productName, analysis.asset_id, analysis.raw as Record<string, unknown>)
        return jsonResponse({ report })
      }
      throw notFound()
    }

    const report = run.report as unknown as ProductIntelligenceReport

    try {
      const asset = await new AssetRepository().findById(ctx, run.asset_id)
      if (asset) {
        report.imageUrl = await getStorageProvider().signedUrl(asset.storage_key, ASSET_VIEW_URL_TTL_SECONDS, "GET")
      }
    } catch {
      // Dự phòng an toàn — trả report với imageUrl rỗng còn hơn chặn cả lượt tra lại
    }

    return jsonResponse({ report })
  },
})
