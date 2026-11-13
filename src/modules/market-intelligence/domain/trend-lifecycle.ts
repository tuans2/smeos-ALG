/**
 * Domain Logic: Vòng đời xu hướng (Trend Lifecycle) & Cấu trúc Dẫn chứng (Evidence).
 * Tuân thủ Đặc tả ALG Intelligence Engine v2.0 (Mục 6.2 & 20-22).
 * Thuần TypeScript — Zero external dependencies.
 */

export type TrendLifecycle = "EMERGING" | "GROWING" | "PEAK" | "STABLE" | "DECLINING";

export interface EvidenceEngagement {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface EvidenceItem {
  id: string;
  source: string; // Tên nhà cung cấp (SerpApi, TikTok, YouTube, Meta)
  sourceType: "market" | "social" | "visual" | "commercial";
  platform: "google" | "tiktok" | "youtube" | "facebook" | "pinterest" | "instagram";
  title: string;
  url: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  author?: string;
  engagement?: EvidenceEngagement;
  evidenceType: "signal" | "video" | "image" | "article" | "listing";
  relevanceScore: number; // 0 - 1
  metadata?: Record<string, unknown>;
}

export interface LifecycleVisualSpec {
  code: TrendLifecycle;
  label: string;
  shortLabel: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

export const LIFECYCLE_SPECS: Record<TrendLifecycle, LifecycleVisualSpec> = {
  EMERGING: {
    code: "EMERGING",
    label: "Mới nổi (Bắt đầu chú ý)",
    shortLabel: "Mới nổi",
    colorClass: "text-purple-700",
    bgClass: "bg-purple-50",
    borderClass: "border-purple-200",
    description: "Tín hiệu mới xuất hiện trên mạng xã hội, tốc độ tăng nhanh nhưng lượng tìm kiếm cơ sở còn khiêm tốn.",
  },
  GROWING: {
    code: "GROWING",
    label: "Đang tăng trưởng (Sóng mạnh)",
    shortLabel: "Đang tăng",
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    description: "Nhu cầu và lượng quan tâm đang gia tăng mạnh mẽ trên đa kênh, thời điểm vàng để làm nội dung.",
  },
  PEAK: {
    code: "PEAK",
    label: "Đạt đỉnh (Nhu cầu cao nhất)",
    shortLabel: "Đạt đỉnh",
    colorClass: "text-rose-700",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200",
    description: "Xu hướng đang ở cao trào mùa vụ hoặc lễ hội, tỷ lệ chuyển đổi đơn hàng cao nhất.",
  },
  STABLE: {
    code: "STABLE",
    label: "Ổn định (Duy trì bền vững)",
    shortLabel: "Ổn định",
    colorClass: "text-sky-700",
    bgClass: "bg-sky-50",
    borderClass: "border-sky-200",
    description: "Dòng sản phẩm truyền thống hoặc phong cách thiết kế quen thuộc, nhu cầu đều đặn quanh năm.",
  },
  DECLINING: {
    code: "DECLINING",
    label: "Hạ nhiệt (Đang giảm dần)",
    shortLabel: "Hạ nhiệt",
    colorClass: "text-stone-600",
    bgClass: "bg-stone-100",
    borderClass: "border-stone-200",
    description: "Mùa vụ đã qua hoặc sự quan tâm giảm dần, nên cân nhắc giảm tỷ trọng tiếp thị.",
  },
};

/**
 * Xác định vòng đời xu hướng dựa trên điểm xu hướng (Trend Score), vận tốc và tỷ lệ tăng trưởng.
 */
export function determineTrendLifecycle(
  trendScore: number,
  velocity: number = 0,
  growthRate: number = 0
): TrendLifecycle {
  if (growthRate > 40 && trendScore < 70) {
    return "EMERGING";
  }
  if (trendScore >= 80 && (velocity < 0.2 || growthRate < 5)) {
    return "PEAK";
  }
  if (trendScore >= 65 || velocity > 0.5 || growthRate > 15) {
    return "GROWING";
  }
  if (growthRate < -15 || velocity < -0.3) {
    return "DECLINING";
  }
  return "STABLE";
}
