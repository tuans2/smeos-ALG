export type ProviderHealthStatus = "HEALTHY" | "DEGRADED" | "DOWN" | "RATE_LIMITED" | string
export type ResearchRunType = "MANUAL" | "SCHEDULED" | "SYSTEM" | string
export type MarketIntelligenceJson = unknown

export interface ProviderHealthRecord {
  id?: string
  provider: string
  status: ProviderHealthStatus
  latency_ms: number | null
  error_rate: number | null
  quota_status: string | null
  last_checked_at: Date
}

export interface TrendSignalRecord {
  id: string
  platform: string
  topic_raw: string
  country_code: string
  region_code: string | null
  city: string | null
  industry: string
  metric_name: string | null
  metric_value: number
  growth_rate: number | null
  confidence: number
  captured_at: Date
  [key: string]: unknown
}

export interface TrendTimeseriesRecord {
  id: string
  topic_id: string
  geo_scope: string
  date: Date
  value: number
  growth_rate?: number | null
  velocity?: number | null
  acceleration?: number | null
  confidence: number
  [key: string]: unknown
}

export interface TopicRecord {
  id: string
  canonical_name: string
  industry?: string
  description?: string | null
  status?: string
  last_seen_at?: Date | null
  scores?: Array<{
    trend_score: number
    viral_score: number
    calculated_at: Date
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export interface ResearchRunRecord {
  id: string
  run_type: string
  status: string
  error_summary?: string | null
  created_at: Date
  completed_at?: Date | null
  [key: string]: unknown
}

export interface ContentOpportunityRecord {
  id: string
  organization_id: string
  topic_id: string
  audience: string | null
  opportunity_summary: string
  content_angles: MarketIntelligenceJson
  recommended_formats: MarketIntelligenceJson
  recommended_hooks: MarketIntelligenceJson
  trend_score: number
  viral_score: number
  commercial_score: number
  content_opportunity_score: number
  confidence: number
  expires_at: Date | null
  created_at: Date
  topic?: { canonical_name: string } | null
  [key: string]: unknown
}

export interface ProductAnalysisRunRecord {
  id: string
  organization_id: string
  asset_id: string
  product_name: string
  trend_fit_score: number
  audience_fit_score: number
  content_fit_score: number
  overall_fit: string
  report: MarketIntelligenceJson
  created_at?: Date
  [key: string]: unknown
}

export interface ProductAnalysisRecord {
  id: string
  organization_id: string
  asset_id: string
  raw?: unknown
  edited?: unknown
  [key: string]: unknown
}

export interface TenantForPersonalization {
  id: string
  name: string
  type: string
  settings: unknown
  brand_profile: {
    tone_of_voice: string | null
    hashtags: unknown
    default_offers: unknown
  } | null
  products: Array<{ id: string; name: string }>
  pricing_rules: Array<{ key: string; value: unknown }>
  customers: Array<{ tier: unknown }>
}

export interface IMarketIntelligenceRepository {
  upsertProviderHealth(data: {
    provider: string
    status: ProviderHealthStatus
    latencyMs?: number | null | undefined
    errorRate?: number | null | undefined
    quotaStatus?: string | null | undefined
  }): Promise<ProviderHealthRecord>

  getAllProviderHealth(): Promise<ProviderHealthRecord[]>

  findCachedSignals(query: string, geo?: string, industry?: string): Promise<TrendSignalRecord[]>
  findCachedSignalsAnyPlatform(query: string, geo?: string, industry?: string): Promise<TrendSignalRecord[]>
  findCachedTimeseries(topic: string, geo?: string): Promise<TrendTimeseriesRecord[]>
  findCachedRelatedTopics(topic: string): Promise<TopicRecord[]>

  createResearchRun(runType: ResearchRunType): Promise<ResearchRunRecord>
  triggerResearchRunAndNotify(
    runType?: ResearchRunType,
    params?: { keyword?: string | undefined; geo?: string | undefined; timeframe?: string | undefined; channel?: string | undefined }
  ): Promise<ResearchRunRecord>
  listResearchRuns(limit?: number): Promise<ResearchRunRecord[]>

  countOpportunities(organizationId: string, minScore?: number, createdAfter?: Date | undefined): Promise<number>
  listOpportunitiesWithTopic(
    organizationId: string,
    options: {
      minScore?: number | undefined
      limit: number
      cursor?: string | undefined
      createdAfter?: Date | undefined
    }
  ): Promise<ContentOpportunityRecord[]>

  getTenantsForPersonalization(): Promise<TenantForPersonalization[]>
  getScoredTopics(topicIds?: string[] | undefined): Promise<TopicRecord[]>

  upsertContentOpportunity(data: {
    organizationId: string
    topicId: string
    audience: string | null
    opportunitySummary: string
    contentAngles: MarketIntelligenceJson
    recommendedFormats: MarketIntelligenceJson
    recommendedHooks: MarketIntelligenceJson
    trendScore: number
    viralScore: number
    commercialScore: number
    contentOpportunityScore: number
    confidence: number
    expiresAt: Date
  }): Promise<ContentOpportunityRecord>

  createContentOpportunity(
    data: Parameters<IMarketIntelligenceRepository["upsertContentOpportunity"]>[0]
  ): Promise<ContentOpportunityRecord>

  findProductAnalysis(organizationId: string, assetId: string): Promise<ProductAnalysisRecord | null>

  createProductAnalysisRun(data: {
    organizationId: string
    assetId: string
    productName: string
    trendFitScore: number
    audienceFitScore: number
    contentFitScore: number
    overallFit: string
    report: unknown
  }): Promise<ProductAnalysisRunRecord>

  listProductAnalysisRuns(organizationId: string, limit?: number): Promise<ProductAnalysisRunRecord[]>
  getProductAnalysisRun(organizationId: string, id: string): Promise<ProductAnalysisRunRecord | null>
  getProductAnalysisById(organizationId: string, id: string): Promise<ProductAnalysisRecord | null>
  findTenantOpportunities(organizationId: string, limit?: number): Promise<ContentOpportunityRecord[]>
  findTopTopics(limit?: number): Promise<TopicRecord[]>
}
