import { prisma } from "@/core/tenancy/infra/prisma"
import { withIndustryKey } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import type {
  Prisma,
  provider_health_status,
  research_run_type,
} from "@/generated/prisma/client"

import type { IMarketIntelligenceRepository } from "../domain/repositories/market-intelligence-repository.interface"

export class MarketIntelligenceRepository implements IMarketIntelligenceRepository {
  constructor(private readonly db = prisma) {}

  // --- Provider Health ---
  async upsertProviderHealth(data: {
    provider: string
    status: provider_health_status
    latencyMs?: number | null | undefined
    errorRate?: number | null | undefined
    quotaStatus?: string | null | undefined
  }) {
    return this.db.provider_health.upsert({
      where: { provider: data.provider },
      create: {
        provider: data.provider,
        status: data.status,
        latency_ms: data.latencyMs ?? null,
        error_rate: data.errorRate ?? null,
        quota_status: data.quotaStatus ?? null,
        last_checked_at: new Date(),
      },
      update: {
        status: data.status,
        latency_ms: data.latencyMs ?? null,
        error_rate: data.errorRate ?? null,
        quota_status: data.quotaStatus ?? null,
        last_checked_at: new Date(),
      },
    })
  }

  async getAllProviderHealth() {
    return this.db.provider_health.findMany({
      orderBy: { last_checked_at: "desc" },
    })
  }

  // --- Cached Trend Queries for CachedFallbackProvider ---
  async findCachedSignals(query: string, geo = "VN", industry = "florist") {
    return this.db.trend_signals.findMany({
      where: {
        platform: { in: ["google_trends", "google_trends_serpapi"] },
        country_code: geo,
        industry,
        topic_raw: { contains: query, mode: "insensitive" },
      },
      orderBy: { captured_at: "desc" },
      take: 5,
    })
  }

  // Giống findCachedSignals nhưng KHÔNG giới hạn nền tảng Google — dùng cho
  // Product Intelligence (Quét theo ảnh sản phẩm), nơi cần đối chiếu với dữ
  // liệu thật đã thu thập từ MỌI nền tảng (Google Trends, TikTok, YouTube),
  // không riêng chuỗi fallback của luồng Quét theo từ khóa.
  async findCachedSignalsAnyPlatform(query: string, geo = "VN", industry = "florist") {
    return this.db.trend_signals.findMany({
      where: {
        country_code: geo,
        industry,
        topic_raw: { contains: query, mode: "insensitive" },
      },
      orderBy: { captured_at: "desc" },
      take: 5,
    })
  }

  async findCachedTimeseries(topic: string, geo = "VN") {
    const topicRecord = await this.db.topics.findFirst({
      where: { canonical_name: { contains: topic, mode: "insensitive" } },
    })
    if (!topicRecord) return []

    return this.db.trend_timeseries.findMany({
      where: { topic_id: topicRecord.id, geo_scope: geo },
      orderBy: { date: "asc" },
      take: 14,
    })
  }

  async findCachedRelatedTopics(topic: string) {
    return this.db.topics.findMany({
      where: {
        canonical_name: { not: topic },
        industry: "florist",
      },
      orderBy: { last_seen_at: "desc" },
      take: 3,
    })
  }

  // --- Research Runs ---
  async createResearchRun(runType: research_run_type) {
    return this.db.research_runs.create({
      data: {
        run_type: runType,
        status: "PENDING",
      },
    })
  }

  async triggerResearchRunAndNotify(
    runType: research_run_type = "MANUAL",
    params?: { keyword?: string | undefined; geo?: string | undefined; timeframe?: string | undefined; channel?: string | undefined }
  ) {
    const run = await this.db.research_runs.create({
      data: {
        run_type: runType,
        status: "PENDING",
        error_summary: params ? `PARAMS:${JSON.stringify(params)}` : null,
        created_at: new Date(),
      },
    })
    try {
      await this.db.$executeRawUnsafe("NOTIFY market_intelligence_research;")
    } catch {
      // Worker vẫn quét được bằng SKIP LOCKED định kỳ
    }
    return run
  }

  async listResearchRuns(limit = 20) {
    return this.db.research_runs.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
    })
  }

  // --- Content Opportunities ---
  async countOpportunities(organizationId: string, minScore = 0, createdAfter?: Date | undefined) {
    const groups = await this.db.content_opportunities.groupBy({
      by: ["topic_id"],
      where: {
        organization_id: organizationId,
        content_opportunity_score: { gte: minScore },
        ...(createdAfter ? { created_at: { gte: createdAfter } } : {}),
      },
    })
    return groups.length
  }

  async listOpportunitiesWithTopic(
    organizationId: string,
    options: {
      minScore?: number | undefined;
      limit: number;
      cursor?: string | undefined;
      createdAfter?: Date | undefined;
    }
  ) {
    const where = {
      organization_id: organizationId,
      content_opportunity_score: { gte: options.minScore ?? 0 },
      ...(options.createdAfter ? { created_at: { gte: options.createdAfter } } : {}),
    }
    return this.db.content_opportunities.findMany({
      where,
      distinct: ["topic_id"],
      include: {
        topic: { select: { canonical_name: true } },
      },
      orderBy: [
        { content_opportunity_score: "desc" },
        { created_at: "desc" },
      ],
      take: options.limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
  }

  // --- Personalization Data ---
  async getTenantsForPersonalization() {
    const orgs = await this.db.organizations.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        ...ORG_SETTINGS_SELECT, // ngành theo cột (ADR-012 T-6c-1)
        brand_profile: {
          select: {
            tone_of_voice: true,
            hashtags: true,
            default_offers: true,
          },
        },
        products: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            name: true,
          },
          take: 20,
        },
        pricing_rules: { select: { key: true, value: true }, take: 5 },
        customers: { where: { status: "ACTIVE" }, select: { tier: true }, take: 100 },
      },
    })
    return orgs.map(withIndustryKey)
  }

  async getScoredTopics(topicIds?: string[] | undefined) {
    return this.db.topics.findMany({
      where: topicIds && topicIds.length > 0 ? { id: { in: topicIds } } : {},
      include: {
        scores: {
          orderBy: { calculated_at: "desc" },
          take: 1,
        },
      },
    })
  }

  async upsertContentOpportunity(data: {
    organizationId: string;
    topicId: string;
    audience: string | null;
    opportunitySummary: string;
    contentAngles: Prisma.InputJsonValue;
    recommendedFormats: Prisma.InputJsonValue;
    recommendedHooks: Prisma.InputJsonValue;
    trendScore: number;
    viralScore: number;
    commercialScore: number;
    contentOpportunityScore: number;
    confidence: number;
    expiresAt: Date;
  }) {
    const existing = await this.db.content_opportunities.findFirst({
      where: { organization_id: data.organizationId, topic_id: data.topicId },
      select: { id: true },
    })

    const payload = {
      audience: data.audience,
      opportunity_summary: data.opportunitySummary,
      content_angles: data.contentAngles,
      recommended_formats: data.recommendedFormats,
      recommended_hooks: data.recommendedHooks,
      trend_score: data.trendScore,
      viral_score: data.viralScore,
      commercial_score: data.commercialScore,
      content_opportunity_score: data.contentOpportunityScore,
      confidence: data.confidence,
      expires_at: data.expiresAt,
    }

    if (existing) {
      return this.db.content_opportunities.update({ where: { id: existing.id }, data: payload })
    }

    return this.db.content_opportunities.create({
      data: { organization_id: data.organizationId, topic_id: data.topicId, ...payload },
    })
  }

  async createContentOpportunity(data: Parameters<MarketIntelligenceRepository["upsertContentOpportunity"]>[0]) {
    return this.upsertContentOpportunity(data)
  }

  async findProductAnalysis(organizationId: string, assetId: string) {
    return this.db.product_analyses.findFirst({
      where: {
        organization_id: organizationId,
        asset_id: assetId,
      },
      orderBy: { created_at: "desc" },
    })
  }

  // --- Product Intelligence — lưu & đọc lịch sử phân tích (nợ #113, đã trả 21/09/2026;
  // asset_id chuyển bắt buộc + bỏ cột image_url ở nợ #118, chốt 22/09/2026) ---
  async createProductAnalysisRun(data: {
    organizationId: string
    assetId: string
    productName: string
    trendFitScore: number
    audienceFitScore: number
    contentFitScore: number
    overallFit: string
    report: unknown
  }) {
    return this.db.product_analysis_runs.create({
      data: {
        organization_id: data.organizationId,
        asset_id: data.assetId,
        product_name: data.productName,
        trend_fit_score: data.trendFitScore,
        audience_fit_score: data.audienceFitScore,
        content_fit_score: data.contentFitScore,
        overall_fit: data.overallFit,
        report: data.report as Prisma.InputJsonValue,
      },
    })
  }

  async listProductAnalysisRuns(organizationId: string, limit = 20) {
    return this.db.product_analysis_runs.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: "desc" },
      take: limit,
    })
  }

  async getProductAnalysisRun(organizationId: string, id: string) {
    return this.db.product_analysis_runs.findFirst({
      where: { organization_id: organizationId, id },
    })
  }

  async getProductAnalysisById(organizationId: string, id: string) {
    return this.db.product_analyses.findFirst({
      where: { organization_id: organizationId, id },
    })
  }

  async findTenantOpportunities(organizationId: string, limit = 10) {
    return this.db.content_opportunities.findMany({
      where: { organization_id: organizationId },
      distinct: ["topic_id"],
      take: limit,
      orderBy: { content_opportunity_score: "desc" },
      include: { topic: true },
    })
  }

  async findTopTopics(limit = 10) {
    return this.db.topics.findMany({
      take: limit,
      orderBy: { last_seen_at: "desc" },
      include: { scores: { take: 1, orderBy: { calculated_at: "desc" } } },
    })
  }
}

let marketIntelligenceRepoInstance: IMarketIntelligenceRepository | null = null

export function getMarketIntelligenceRepository(db = prisma): IMarketIntelligenceRepository {
  if (db !== prisma) return new MarketIntelligenceRepository(db)
  if (!marketIntelligenceRepoInstance) {
    marketIntelligenceRepoInstance = new MarketIntelligenceRepository()
  }
  return marketIntelligenceRepoInstance
}

export const marketIntelligenceRepo: IMarketIntelligenceRepository = getMarketIntelligenceRepository()

