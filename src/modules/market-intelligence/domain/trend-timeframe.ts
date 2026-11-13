/**
 * SSOT cho các khung thời gian phân tích của Market Intelligence Engine.
 * Định nghĩa chuẩn: Ngày (24h), Tuần (7d), Tháng (30d), 3 Tháng (90d), và Tất cả.
 */

export type MarketTimeframeKey = "DAY" | "WEEK" | "MONTH" | "QUARTER" | "ALL";

export interface TimeframeConfig {
  key: MarketTimeframeKey;
  label: string;
  shortLabel: string;
  badgeLabel: string;
  durationMs: number | null;
  description: string;
}

export const TIMEFRAME_CONFIGS: Record<MarketTimeframeKey, TimeframeConfig> = {
  DAY: {
    key: "DAY",
    label: "Theo Ngày",
    shortLabel: "Ngày",
    badgeLabel: "⚡ Ngày",
    durationMs: 24 * 60 * 60 * 1000,
    description: "Xem chi tiết từng ngày cụ thể (Hôm nay, Hôm qua, các ngày trong tuần)",
  },
  WEEK: {
    key: "WEEK",
    label: "Theo Tuần",
    shortLabel: "Tuần",
    badgeLabel: "📅 Tuần",
    durationMs: 7 * 24 * 60 * 60 * 1000,
    description: "Xem chi tiết từng tuần cụ thể (Tuần này, Tuần trước, các tuần trong tháng)",
  },
  MONTH: {
    key: "MONTH",
    label: "Theo Tháng",
    shortLabel: "Tháng",
    badgeLabel: "🗓️ Tháng",
    durationMs: 30 * 24 * 60 * 60 * 1000,
    description: "Xem chi tiết từng tháng cụ thể (Tháng này, Tháng trước, các tháng trong quý)",
  },
  QUARTER: {
    key: "QUARTER",
    label: "Theo 3 Tháng",
    shortLabel: "3 Tháng",
    badgeLabel: "🍂 3 Tháng",
    durationMs: 90 * 24 * 60 * 60 * 1000,
    description: "Xem chi tiết theo từng Quý / chu kỳ 3 tháng theo mùa vụ",
  },
  ALL: {
    key: "ALL",
    label: "Tất Cả",
    shortLabel: "Tất cả",
    badgeLabel: "Toàn bộ",
    durationMs: null,
    description: "Toàn bộ cơ hội thị trường và tín hiệu đã thu thập từ trước đến nay",
  },
};

export interface TimeframeDistribution {
  day: number;
  week: number;
  month: number;
  quarter: number;
  all: number;
}

export interface MinimalTimeItem {
  createdAt: string | Date;
}

// Re-export các tiện ích PeriodBucket từ trend-timeframe-buckets.ts
export {
  type PeriodBucket,
  generateDailyBuckets,
  generateWeeklyBuckets,
  generateMonthlyBuckets,
  generateQuarterlyBuckets,
  filterByPeriodBucket,
} from "./trend-timeframe-buckets";

/**
 * Tính toán số lượng cơ hội phân bổ tổng quát.
 */
export function computeTimeframeDistribution<T extends MinimalTimeItem>(
  items: T[],
  referenceNowMs: number = Date.now()
): TimeframeDistribution {
  let day = 0;
  let week = 0;
  let month = 0;
  let quarter = 0;

  const dayLimit = TIMEFRAME_CONFIGS.DAY.durationMs!;
  const weekLimit = TIMEFRAME_CONFIGS.WEEK.durationMs!;
  const monthLimit = TIMEFRAME_CONFIGS.MONTH.durationMs!;
  const quarterLimit = TIMEFRAME_CONFIGS.QUARTER.durationMs!;

  for (const item of items) {
    const itemTime = new Date(item.createdAt).getTime();
    if (isNaN(itemTime)) continue;

    const diff = Math.max(0, referenceNowMs - itemTime);

    if (diff <= dayLimit) day++;
    if (diff <= weekLimit) week++;
    if (diff <= monthLimit) month++;
    if (diff <= quarterLimit) quarter++;
  }

  return {
    day,
    week,
    month,
    quarter,
    all: items.length,
  };
}

/**
 * Lọc danh sách mục theo khung thời gian rolling (hoặc toàn bộ).
 */
export function filterByTimeframe<T extends MinimalTimeItem>(
  items: T[],
  timeframe: MarketTimeframeKey,
  referenceNowMs: number = Date.now()
): T[] {
  if (timeframe === "ALL") {
    return items;
  }

  const config = TIMEFRAME_CONFIGS[timeframe];
  if (!config.durationMs) {
    return items;
  }

  const limitMs = config.durationMs;

  return items.filter((item) => {
    const itemTime = new Date(item.createdAt).getTime();
    if (isNaN(itemTime)) return false;
    const diff = Math.max(0, referenceNowMs - itemTime);
    return diff <= limitMs;
  });
}

/**
 * Xác định badge hiển thị khung thời gian và màu sắc tương ứng cho từng mục.
 */
export function getOpportunityTimeframeMeta(
  createdAt: string | Date,
  referenceNowMs: number = Date.now()
): {
  key: MarketTimeframeKey;
  label: string;
  badgeClass: string;
} {
  const itemTime = new Date(createdAt).getTime();
  if (isNaN(itemTime)) {
    return {
      key: "ALL",
      label: "Đã lưu",
      badgeClass: "bg-stone-100 text-stone-600 border-stone-200",
    };
  }

  const diff = Math.max(0, referenceNowMs - itemTime);

  if (diff <= TIMEFRAME_CONFIGS.DAY.durationMs!) {
    return {
      key: "DAY",
      label: "⚡ 24h qua",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-300 shadow-2xs font-extrabold",
    };
  }

  if (diff <= TIMEFRAME_CONFIGS.WEEK.durationMs!) {
    return {
      key: "WEEK",
      label: "📅 Tuần này",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-300 font-bold",
    };
  }

  if (diff <= TIMEFRAME_CONFIGS.MONTH.durationMs!) {
    return {
      key: "MONTH",
      label: "🗓️ Tháng này",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 font-medium",
    };
  }

  if (diff <= TIMEFRAME_CONFIGS.QUARTER.durationMs!) {
    return {
      key: "QUARTER",
      label: "🍂 3 tháng",
      badgeClass: "bg-stone-100 text-stone-700 border-stone-300 font-medium",
    };
  }

  return {
    key: "ALL",
    label: "Kho lưu",
    badgeClass: "bg-stone-100 text-stone-500 border-stone-200",
  };
}

export type ChampionPeriodKey = "WEEK" | "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR";

export interface PeriodChampion<T> {
  key: ChampionPeriodKey;
  label: string;
  subLabel: string;
  badge: string;
  durationDays: number;
  item: T | null;
}

export interface ScoredOpportunityItem extends MinimalTimeItem {
  id: string;
  topicName: string;
  contentOpportunityScore: number;
  trendScore: number;
  viralScore: number;
  commercialScore: number;
}

const CHAMPION_PERIOD_CONFIGS: Array<{
  key: ChampionPeriodKey;
  label: string;
  subLabel: string;
  badge: string;
  durationDays: number;
}> = [
  { key: "WEEK", label: "Top 1 Tuần", subLabel: "7 ngày qua", badge: "🥇 Tuần", durationDays: 7 },
  { key: "MONTH", label: "Top 1 Tháng", subLabel: "30 ngày qua", badge: "🥇 Tháng", durationDays: 30 },
  { key: "QUARTER", label: "Top 1 3 Tháng", subLabel: "90 ngày qua", badge: "🥇 3 Tháng", durationDays: 90 },
  { key: "HALF_YEAR", label: "Top 1 6 Tháng", subLabel: "180 ngày qua", badge: "🥇 6 Tháng", durationDays: 180 },
  { key: "YEAR", label: "Top 1 1 Năm", subLabel: "365 ngày qua", badge: "🥇 1 Năm", durationDays: 365 },
];

/**
 * Tìm ra kết quả Top 1 cơ hội xuất sắc nhất cho từng chu kỳ:
 * Tuần (7d) - Tháng (30d) - 3 Tháng (90d) - 6 Tháng (180d) - 1 Năm (365d)
 */
export function findPeriodChampions<T extends ScoredOpportunityItem>(
  items: T[],
  referenceNowMs: number = Date.now()
): Array<PeriodChampion<T>> {
  const chosenTopicNames = new Set<string>();
  const chosenIds = new Set<string>();

  return CHAMPION_PERIOD_CONFIGS.map((cfg) => {
    const limitMs = cfg.durationDays * 24 * 60 * 60 * 1000;

    const candidates = items.filter((item) => {
      const itemTime = new Date(item.createdAt).getTime();
      if (isNaN(itemTime)) return false;
      const diff = Math.max(0, referenceNowMs - itemTime);
      return diff <= limitMs;
    });

    candidates.sort((a, b) => {
      if (b.contentOpportunityScore !== a.contentOpportunityScore) {
        return b.contentOpportunityScore - a.contentOpportunityScore;
      }
      if (b.trendScore !== a.trendScore) {
        return b.trendScore - a.trendScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Ưu tiên ứng viên có chủ đề và ID chưa từng được trao cúp ở chu kỳ trước
    const selected =
      candidates.find(
        (c) => !chosenTopicNames.has(c.topicName) && !chosenIds.has(c.id)
      ) ??
      candidates.find((c) => !chosenIds.has(c.id)) ??
      candidates[0] ??
      null;

    if (selected) {
      chosenTopicNames.add(selected.topicName);
      chosenIds.add(selected.id);
    }

    return {
      key: cfg.key,
      label: cfg.label,
      subLabel: cfg.subLabel,
      badge: cfg.badge,
      durationDays: cfg.durationDays,
      item: selected,
    };
  });
}
