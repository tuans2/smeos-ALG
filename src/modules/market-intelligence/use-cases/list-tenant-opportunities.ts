import type { IMarketIntelligenceRepository } from "../domain/repositories/market-intelligence-repository.interface";
import { getMarketIntelligenceRepository } from "../infra/market-intelligence-repository";
import { getTopicDualRealVideoEvidence } from "../domain/video-evidence-catalog";
import {
  type MarketTimeframeKey,
  TIMEFRAME_CONFIGS,
} from "../domain/trend-timeframe";
import { urlHostIs } from "@/lib/url-host";

export interface ListOpportunitiesParams {
  organizationId: string;
  limit?: number | undefined;
  cursor?: string | undefined;
  minScore?: number | undefined;
  timeframe?: MarketTimeframeKey | undefined;
}

export interface EvidenceReference {
  title: string;
  type: "ARTICLE" | "TIKTOK_REELS" | "IMAGE_PINTEREST" | "GOOGLE_TRENDS" | "YOUTUBE";
  url: string;
  platform: string;
  engagementNote?: string | undefined;
  thumbnailUrl?: string | undefined;
  author?: string | undefined;
  metrics?: string | undefined;
}

export interface ListOpportunitiesResult {
  items: Array<{
    id: string;
    organizationId: string;
    topicName: string;
    audience: string | null;
    opportunitySummary: string;
    contentAngles: unknown;
    recommendedFormats: unknown;
    recommendedHooks: unknown;
    evidenceReferences: EvidenceReference[];
    trendScore: number;
    viralScore: number;
    commercialScore: number;
    contentOpportunityScore: number;
    confidence: number;
    expiresAt: Date | null;
    createdAt: Date;
  }>;
  nextCursor: string | null;
  total: number;
}

/**
 * Giải quyết danh sách dẫn chứng video cho mỗi cơ hội nội dung.
 * Dùng SSOT từ `video-evidence-catalog.ts` (Domain Layer) thay vì duplicate hardcoded data.
 */
function resolveEvidenceReferences(angles: unknown, topicName: string, _summary: string): EvidenceReference[] {
  const catalogEvidence = getTopicDualRealVideoEvidence(topicName);
  let rawRefs: EvidenceReference[] = [];

  // `content_angles` là cột Json: dạng mảng góc tiếp cận (dẫn chứng ở phần tử đầu) hoặc một đối tượng.
  const holder = (Array.isArray(angles) ? angles[0] : angles) as { evidenceReferences?: unknown } | null | undefined;
  if (holder && typeof holder === "object" && Array.isArray(holder.evidenceReferences)) {
    rawRefs = holder.evidenceReferences as EvidenceReference[];
  }

  if (rawRefs.length > 0) {
    // Đảm bảo các video references luôn có thumbnail thật từ SSOT catalog, loại bỏ ảnh Unsplash và placeholder mock
    return rawRefs.map((ref) => {
      const isUnsplash = urlHostIs(ref.thumbnailUrl, "unsplash.com");
      const isGenericMockAuthor =
        ref.author === "@florist.trend" ||
        ref.author === "Kênh Nghệ Thuật Chế Tác" ||
        !ref.author;
      const isGenericMockMetrics =
        !ref.metrics ||
        ref.metrics.includes("324 likes") ||
        ref.metrics.includes("3.8k lượt xem");

      if (ref.type === "TIKTOK_REELS" || ref.platform?.toLowerCase().includes("tiktok") || urlHostIs(ref.url, "tiktok.com")) {
        const isSearchUrl = !ref.url || ref.url.includes("/search?") || ref.url.includes("search_query");
        return {
          ...ref,
          title: ref.title || catalogEvidence.tiktok.title,
          url: isSearchUrl ? catalogEvidence.tiktok.videoUrl : ref.url,
          thumbnailUrl: (!ref.thumbnailUrl || isUnsplash) ? catalogEvidence.tiktok.thumbnailUrl : ref.thumbnailUrl,
          author: isGenericMockAuthor ? catalogEvidence.tiktok.author : ref.author,
          metrics: isGenericMockMetrics ? catalogEvidence.tiktok.metrics : ref.metrics,
        };
      }
      if (ref.type === "YOUTUBE" || ref.platform?.toLowerCase().includes("youtube") || urlHostIs(ref.url, "youtube.com")) {
        const isSearchUrl = !ref.url || ref.url.includes("results?search_query") || ref.url.includes("/results") || ref.url.includes("/search?");
        return {
          ...ref,
          title: ref.title || catalogEvidence.youtube.title,
          url: isSearchUrl ? catalogEvidence.youtube.videoUrl : ref.url,
          thumbnailUrl: (!ref.thumbnailUrl || isUnsplash) ? catalogEvidence.youtube.thumbnailUrl : ref.thumbnailUrl,
          author: isGenericMockAuthor ? catalogEvidence.youtube.author : ref.author,
          metrics: isGenericMockMetrics ? catalogEvidence.youtube.metrics : ref.metrics,
        };
      }
      return ref;
    });
  }

  const encodedTopic = encodeURIComponent(topicName);
  const encodedQuery = encodeURIComponent(topicName);

  return [
    {
      title: catalogEvidence.tiktok.title,
      type: "TIKTOK_REELS",
      platform: "TikTok / Reels",
      url: catalogEvidence.tiktok.videoUrl,
      thumbnailUrl: catalogEvidence.tiktok.thumbnailUrl,
      author: catalogEvidence.tiktok.author,
      metrics: catalogEvidence.tiktok.metrics,
      engagementNote: "Tham khảo mẫu video clip & cách phối hoa triệu view",
    },
    {
      title: catalogEvidence.youtube.title,
      type: "YOUTUBE",
      platform: "YouTube",
      url: catalogEvidence.youtube.videoUrl,
      thumbnailUrl: catalogEvidence.youtube.thumbnailUrl,
      author: catalogEvidence.youtube.author,
      metrics: catalogEvidence.youtube.metrics,
      engagementNote: "Video hướng dẫn & trình diễn sản phẩm thực tế",
    },
    {
      title: `Biểu đồ Google Trends: ${topicName}`,
      type: "GOOGLE_TRENDS",
      platform: "Google Trends",
      url: `https://trends.google.com/trends/explore?q=${encodedTopic}&geo=VN`,
      engagementNote: "Dữ liệu nhu cầu tìm kiếm trực tiếp tại Việt Nam",
    },
    {
      title: `Mẫu thiết kế phong cách: ${topicName}`,
      type: "IMAGE_PINTEREST",
      platform: "Pinterest",
      url: `https://www.pinterest.com/search/pins/?q=${encodedQuery}`,
      engagementNote: "Kho cảm hứng hình ảnh sản phẩm chuẩn phong cách",
    },
  ];
}

/**
 * Truy vấn danh sách cơ hội nội dung đã cá nhân hóa cho một tổ chức.
 * Tuyệt đối cách ly theo `organizationId`.
 */
export async function listTenantOpportunities(
  params: ListOpportunitiesParams,
  repo: IMarketIntelligenceRepository = getMarketIntelligenceRepository()
): Promise<ListOpportunitiesResult> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const minScore = params.minScore ?? 0;

  let createdAfter: Date | undefined;
  if (params.timeframe && params.timeframe !== "ALL") {
    const durationMs = TIMEFRAME_CONFIGS[params.timeframe]?.durationMs;
    if (durationMs) {
      createdAfter = new Date(Date.now() - durationMs);
    }
  }

  const [total, records] = await Promise.all([
    repo.countOpportunities(params.organizationId, minScore, createdAfter),
    repo.listOpportunitiesWithTopic(params.organizationId, {
      minScore,
      limit,
      cursor: params.cursor,
      createdAfter,
    }),
  ]);

  let nextCursor: string | null = null;
  let itemsToReturn = records;

  if (records.length > limit) {
    const nextItem = records[limit];
    if (nextItem) {
      nextCursor = nextItem.id;
    }
    itemsToReturn = records.slice(0, limit);
  }

  return {
    items: itemsToReturn.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      topicName: r.topic?.canonical_name ?? "Chủ đề",
      audience: r.audience ?? null,
      opportunitySummary: r.opportunity_summary,
      contentAngles: r.content_angles,
      recommendedFormats: r.recommended_formats,
      recommendedHooks: r.recommended_hooks,
      evidenceReferences: resolveEvidenceReferences(r.content_angles, r.topic?.canonical_name ?? "", r.opportunity_summary),
      trendScore: r.trend_score,
      viralScore: r.viral_score,
      commercialScore: r.commercial_score,
      contentOpportunityScore: r.content_opportunity_score,
      confidence: r.confidence,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    })),
    nextCursor,
    total,
  };
}
