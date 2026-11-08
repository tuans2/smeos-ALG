/**
 * CURATED REFERENCE CATALOG — Danh mục dẫn chứng video YouTube & TikTok cho Market Intelligence.
 * Domain Layer — Pure TypeScript, Zero dependencies.
 *
 * LƯU Ý: Đây là danh mục tham khảo được tuyển chọn thủ công (curated catalog):
 * - YouTube Video IDs: THẬT (có thể xem được trên YouTube)
 * - Thumbnail URLs: THẬT (lấy từ YouTube CDN i.ytimg.com)
 * - Metrics (lượt xem, tim): ƯỚC TÍNH THAM KHẢO, không phải real-time API data
 * - TikTok URLs: Dẫn đến trang tìm kiếm TikTok (không phải video cụ thể)
 *
 * Catalog này được sử dụng làm fallback khi SerpApi chưa trả evidence snippets thật.
 * Theo AGENTS.md "Dẫn chứng Video Kép" — quản lý tập trung tại file này (SSOT).
 */

import {
  DIVERSE_VIDEO_PRESETS,
  FALLBACK_DIVERSE_POOLS,
  hashStringDeterministic,
} from "./video-catalog-presets";
import { urlHostIs } from "@/lib/url-host"

export interface EvidenceItemLike {
  title: string;
  type?: string;
  url?: string;
  platform?: string;
  thumbnailUrl?: string;
  author?: string;
  metrics?: string;
}

export interface OpportunityLike {
  id: string;
  topicName: string;
  opportunitySummary: string;
  audience?: string | null;
  evidenceReferences?: EvidenceItemLike[];
}

export interface VideoEvidencePreview {
  thumbnailUrl: string;
  alt: string;
  platform: "TIKTOK" | "YOUTUBE" | "WEB";
  author: string;
  metrics: string;
  videoUrl: string;
  title: string;
  isLiveEvidence: boolean;
}

export interface DualVideoEvidencePreview {
  tiktok: VideoEvidencePreview;
  youtube: VideoEvidencePreview;
  primary: VideoEvidencePreview;
}

export function getTopicDualRealVideoEvidence(topicName: string): { youtube: VideoEvidencePreview; tiktok: VideoEvidencePreview } {
  const lower = topicName.toLowerCase();

  for (const preset of DIVERSE_VIDEO_PRESETS) {
    if (preset.keywords.some((k) => lower.includes(k))) {
      return {
        youtube: preset.youtube,
        tiktok: preset.tiktok,
      };
    }
  }

  // Fallback đa dạng bằng deterministic hash theo tên topic để không bao giờ bị trùng lặp video
  const hash = hashStringDeterministic(topicName);
  const fallbackIndex = hash % FALLBACK_DIVERSE_POOLS.length;
  const poolItem = FALLBACK_DIVERSE_POOLS[fallbackIndex]!;

  return {
    youtube: poolItem.youtube,
    tiktok: poolItem.tiktok,
  };
}

export function getDualOpportunityEvidencePreview(item: OpportunityLike): DualVideoEvidencePreview {
  const fallback = getTopicDualRealVideoEvidence(item.topicName);
  const refs = item.evidenceReferences || [];

  const tiktokRef = refs.find(
    (r) =>
      (r.type === "TIKTOK_REELS" || r.platform?.toLowerCase().includes("tiktok") || urlHostIs(r.url, "tiktok.com")) &&
      Boolean(r.thumbnailUrl) &&
      !urlHostIs(r.thumbnailUrl, "unsplash.com")
  );

  const ytRef = refs.find(
    (r) =>
      (r.type === "YOUTUBE" || r.platform?.toLowerCase().includes("youtube") || urlHostIs(r.url, "youtube.com")) &&
      Boolean(r.thumbnailUrl) &&
      !urlHostIs(r.thumbnailUrl, "unsplash.com")
  );

  const isTtSearch = !tiktokRef?.url || tiktokRef.url.includes("/search?") || tiktokRef.url.includes("search_query");
  const isYtSearch = !ytRef?.url || ytRef.url.includes("results?search_query") || ytRef.url.includes("/results") || ytRef.url.includes("/search?");

  const tiktok: VideoEvidencePreview = tiktokRef && tiktokRef.thumbnailUrl
    ? {
        thumbnailUrl: tiktokRef.thumbnailUrl,
        alt: tiktokRef.title || fallback.tiktok.alt,
        platform: "TIKTOK",
        author: tiktokRef.author || fallback.tiktok.author,
        metrics: tiktokRef.metrics || fallback.tiktok.metrics,
        videoUrl: isTtSearch || !tiktokRef.url ? fallback.tiktok.videoUrl : tiktokRef.url,
        title: tiktokRef.title || fallback.tiktok.title,
        isLiveEvidence: true,
      }
    : fallback.tiktok;

  const youtube: VideoEvidencePreview = ytRef && ytRef.thumbnailUrl
    ? {
        thumbnailUrl: ytRef.thumbnailUrl,
        alt: ytRef.title || fallback.youtube.alt,
        platform: "YOUTUBE",
        author: ytRef.author || fallback.youtube.author,
        metrics: ytRef.metrics || fallback.youtube.metrics,
        videoUrl: isYtSearch || !ytRef.url ? fallback.youtube.videoUrl : ytRef.url,
        title: ytRef.title || fallback.youtube.title,
        isLiveEvidence: true,
      }
    : fallback.youtube;

  return {
    tiktok,
    youtube,
    primary: tiktok,
  };
}

export function getOpportunityEvidencePreview(item: OpportunityLike): VideoEvidencePreview {
  const dual = getDualOpportunityEvidencePreview(item);
  return dual.primary;
}
