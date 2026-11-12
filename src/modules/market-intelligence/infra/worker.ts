import type { VideoEvidenceSnippet } from "@/core/ports/trend-provider";
import { Client } from "pg";
import { prisma } from "@/core/tenancy/infra/prisma";
import { TrendProviderChain } from "../adapters/trend-provider-chain";
import {
  calculateTrendScore,
  calculateViralScore,
  calculateCommercialScore,
  calculateContentOpportunityScore,
  estimateTopicContextMetrics,
  CURRENT_SCORING_MODEL_VERSION,
} from "../domain/scoring";
import { personalizeOpportunitiesForTenants } from "../use-cases/personalize-opportunities";
import {
  getSeasonalRecommendedKeywords,
  getDailyRotatedKeywords,
} from "../domain/market-taxonomy";

const POLL_INTERVAL_MS = 15000; // Quét dự phòng mỗi 15s nếu không nhận được NOTIFY
let isRunning = true;
let isProcessing = false;

export async function executeSingleRun(runId: string, runType: string): Promise<void> {
  console.log(`[MI-Worker] Bắt đầu xử lý run ${runId} (loại: ${runType})...`);
  const startedAt = new Date();

  await prisma.research_runs.update({
    where: { id: runId },
    data: { status: "RUNNING", started_at: startedAt },
  });

  const runRecord = await prisma.research_runs.findUnique({
    where: { id: runId },
    select: { error_summary: true },
  });

  // Cơ chế 2 & 3: Quét xoay vòng nhóm theo ngày cho DAILY_DEEP hoặc theo mùa vụ cho INTRADAY
  let keywordsToScan: string[] =
    runType === "DAILY_DEEP"
      ? getDailyRotatedKeywords()
      : getSeasonalRecommendedKeywords();
  let targetGeo = "VN";
  let targetTimeframe = "now 7-d";
  let targetChannel = "omnichannel";
  let targetIndustry = "florist";

  if (runRecord?.error_summary?.startsWith("PARAMS:")) {
    try {
      const parsed = JSON.parse(runRecord.error_summary.replace("PARAMS:", ""));
      if (parsed.keyword && typeof parsed.keyword === "string") {
        const raw = parsed.keyword.trim();
        if (raw.includes(",")) {
          keywordsToScan = raw
            .split(",")
            .map((k: string) => k.trim())
            .filter(Boolean);
        } else if (raw) {
          keywordsToScan = [raw];
        }
      }
      if (parsed.geo && typeof parsed.geo === "string") {
        targetGeo = parsed.geo;
      }
      if (parsed.timeframe && typeof parsed.timeframe === "string") {
        targetTimeframe = parsed.timeframe;
      }
      if (parsed.channel && typeof parsed.channel === "string") {
        targetChannel = parsed.channel;
      }
      if (parsed.industry && typeof parsed.industry === "string") {
        targetIndustry = parsed.industry.toLowerCase();
      } else if (parsed.industryKey && typeof parsed.industryKey === "string") {
        targetIndustry = parsed.industryKey.toUpperCase() === "FLORAL" ? "florist" : parsed.industryKey.toLowerCase();
      }
    } catch {
      // Dùng fallback mặc định
    }
  }

  const providerChain = new TrendProviderChain();
  const sourcesAttempted = 3; // Google, TikTok, YouTube
  let sourcesSucceeded = 0;
  let sourcesFailed = 0;
  let recordsCollected = 0;
  const createdTopicIds: string[] = [];
  const topicEvidenceMap: Record<string, VideoEvidenceSnippet[]> = {};

  try {
    // Đảm bảo có sẵn bản ghi nguồn thị trường mặc định
    const defaultGoogleSource = await prisma.market_sources.upsert({
      where: { provider_platform: { provider: "google", platform: "google_trends" } },
      create: {
        provider: "google",
        platform: "google_trends",
        source_type: "TREND_SEARCH",
        status: "ACTIVE",
      },
      update: { last_success_at: new Date() },
    });

    for (const keyword of keywordsToScan) {
      try {
        const signals = await providerChain.searchTrends({
          query: keyword,
          geo: targetGeo,
          timeframe: targetTimeframe,
          channel: targetChannel,
          industry: targetIndustry,
        });

        if (signals.length > 0) {
          sourcesSucceeded++;
          recordsCollected += signals.length;

          // 1. Lưu tín hiệu vào bảng `trend_signals` theo từng nền tảng tương ứng
          for (const sig of signals) {
            let currentSourceId = defaultGoogleSource.id;

            if (sig.platform === "tiktok_trends") {
              const src = await prisma.market_sources.upsert({
                where: { provider_platform: { provider: "tiktok", platform: "tiktok_trends" } },
                create: { provider: "tiktok", platform: "tiktok_trends", source_type: "VIRAL_HASHTAG", status: "ACTIVE" },
                update: { last_success_at: new Date() },
              });
              currentSourceId = src.id;
            } else if (sig.platform === "youtube_trends") {
              const src = await prisma.market_sources.upsert({
                where: { provider_platform: { provider: "youtube", platform: "youtube_trends" } },
                create: { provider: "youtube", platform: "youtube_trends", source_type: "VIDEO_SEARCH", status: "ACTIVE" },
                update: { last_success_at: new Date() },
              });
              currentSourceId = src.id;
            }

            await prisma.trend_signals.upsert({
              where: {
                source_id_platform_country_code_topic_raw_captured_at: {
                  source_id: currentSourceId,
                  platform: sig.platform,
                  country_code: sig.countryCode,
                  topic_raw: sig.topicRaw,
                  captured_at: sig.capturedAt,
                },
              },
              create: {
                source_id: currentSourceId,
                platform: sig.platform,
                country_code: sig.countryCode,
                region_code: sig.regionCode ?? null,
                city: sig.city ?? null,
                industry: sig.industry,
                topic_raw: sig.topicRaw,
                metric_name: sig.metricName,
                metric_value: sig.metricValue,
                growth_rate: sig.growthRate ?? null,
                confidence: sig.confidence,
                captured_at: sig.capturedAt,
              },
              update: {
                metric_value: sig.metricValue,
                growth_rate: sig.growthRate ?? null,
                confidence: sig.confidence,
              },
            });

            // 2. Tạo hoặc cập nhật `topics` (Canonical Topic)
            const topic = await prisma.topics.upsert({
              where: {
                canonical_name_industry: {
                  canonical_name: sig.topicRaw,
                  industry: sig.industry,
                },
              },
              create: {
                canonical_name: sig.topicRaw,
                industry: sig.industry,
                status: "EMERGING",
                last_seen_at: new Date(),
              },
              update: {
                last_seen_at: new Date(),
              },
            });

            if (!createdTopicIds.includes(topic.id)) {
              createdTopicIds.push(topic.id);
            }

            if (sig.evidenceSnippets && sig.evidenceSnippets.length > 0) {
              topicEvidenceMap[topic.id] = [
                ...(topicEvidenceMap[topic.id] || []),
                ...sig.evidenceSnippets,
              ];
            }

            // 3. Tính toán điểm số xu hướng với công thức ngữ cảnh động
            const context = estimateTopicContextMetrics(topic.canonical_name);

            const isTikTok = sig.platform === "tiktok_trends";
            const isYouTube = sig.platform === "youtube_trends";

            const calculatedViral = isTikTok
              ? calculateViralScore({
                  socialSignals: sig.metricValue * 2,
                  engagementRate: Math.max(3, (sig.growthRate ?? 0) * 0.15),
                  isBreakout: (sig.growthRate ?? 0) > 40,
                })
              : isYouTube
              ? calculateViralScore({
                  socialSignals: sig.metricValue * 1.5,
                  engagementRate: 5,
                  isBreakout: (sig.growthRate ?? 0) > 30,
                })
              : context.viralScore;

            const calculatedTrend = calculateTrendScore({
              baselineInterest: sig.metricValue || context.trendScore,
              growthRate: sig.growthRate ?? 0,
              velocity: (sig.growthRate ?? 0) > 30 ? 0.3 : 0.1,
              acceleration: (sig.growthRate ?? 0) > 50 ? 0.1 : 0.02,
            });

            const trendScore = Math.round((calculatedTrend * 0.45 + context.trendScore * 0.55) * 10) / 10;
            const viralScore = Math.round((calculatedViral * 0.4 + context.viralScore * 0.6) * 10) / 10;
            const commercialScore = context.commercialScore;

            const oppScore = calculateContentOpportunityScore(
              trendScore,
              viralScore,
              commercialScore
            );

            // 4. Lưu vào bảng `topic_scores`
            await prisma.topic_scores.create({
              data: {
                topic_id: topic.id,
                geo_scope: targetGeo,
                industry: targetIndustry,
                period: "7d",
                trend_score: trendScore,
                viral_score: viralScore,
                commercial_score: commercialScore,
                content_opportunity_score: oppScore,
                confidence: sig.confidence,
                model_version: CURRENT_SCORING_MODEL_VERSION,
              },
            });
          }
        }
      } catch (err) {
        sourcesFailed++;
        console.error(`[MI-Worker] Lỗi khi quét từ khóa "${keyword}":`, err);
      }
    }

    // 5. Cá nhân hóa tạo Content Opportunities cho từng tenant (Đợt A)
    let opportunitiesCreated = 0;
    if (createdTopicIds.length > 0) {
      console.log(
        `[MI-Worker] Bắt đầu cá nhân hóa cơ hội cho ${createdTopicIds.length} chủ đề mới...`
      );
      const personalizeRes = await personalizeOpportunitiesForTenants(
        createdTopicIds,
        topicEvidenceMap
      );
      opportunitiesCreated = personalizeRes.opportunitiesCreated;
    }

    // Cập nhật trạng thái COMPLETED
    const completedAt = new Date();
    await prisma.research_runs.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        completed_at: completedAt,
        sources_attempted: sourcesAttempted,
        sources_succeeded: sourcesSucceeded,
        sources_failed: sourcesFailed,
        records_collected: recordsCollected,
        topics_created: createdTopicIds.length,
        opportunities_created: opportunitiesCreated,
        error_summary: null,
      },
    });

    console.log(
      `[MI-Worker] Run ${runId} hoàn tất thành công. Thu thập: ${recordsCollected} bản ghi, ${createdTopicIds.length} chủ đề, ${opportunitiesCreated} cơ hội nội dung.`
    );
  } catch (globalErr: unknown) {
    console.error(`[MI-Worker] Run ${runId} thất bại hoàn toàn:`, globalErr);
    await prisma.research_runs.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        completed_at: new Date(),
        error_summary: (globalErr instanceof Error ? globalErr.message : null) ?? "Lỗi không xác định trong worker",
      },
    });
  }
}

/**
 * Quét tìm job PENDING bằng SELECT ... FOR UPDATE SKIP LOCKED
 */
async function claimNextPendingRun(): Promise<{ id: string; run_type: string } | null> {
  const result = await prisma.$queryRaw<Array<{ id: string; run_type: string }>>`
    SELECT id, run_type
    FROM research_runs
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  `;

  return result.length > 0 && result[0] ? result[0] : null;
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    let run = await claimNextPendingRun();
    while (run && isRunning) {
      await executeSingleRun(run.id, run.run_type);
      run = await claimNextPendingRun();
    }
  } catch (err) {
    console.error("[MI-Worker] Lỗi trong vòng lặp processQueue:", err);
  } finally {
    isProcessing = false;
  }
}

/**
 * Khởi động Worker:
 * 1. Mở kết nối Postgres riêng biệt với pg.Client để LISTEN `market_intelligence_research`.
 * 2. Thiết lập chu kỳ polling 15s dự phòng (SKIP LOCKED).
 */
export async function startWorker(): Promise<void> {
  console.log("[MI-Worker] Đang khởi động Market Intelligence Research Worker...");

  const connectionString =
    process.env.DATABASE_URL || "postgresql://alg:alg@localhost:5433/alg";
  const pgClient = new Client({ connectionString });

  try {
    await pgClient.connect();
    await pgClient.query("LISTEN market_intelligence_research");
    console.log("[MI-Worker] Đã lắng nghe kênh NOTIFY 'market_intelligence_research'.");

    pgClient.on("notification", (msg) => {
      if (msg.channel === "market_intelligence_research") {
        console.log("[MI-Worker] Nhận tín hiệu NOTIFY! Đang kích hoạt xử lý hàng đợi...");
        void processQueue();
      }
    });

    pgClient.on("error", (err) => {
      console.error("[MI-Worker] Kết nối LISTEN gặp lỗi:", err);
    });
  } catch (err) {
    console.error("[MI-Worker] Không thể kết nối pg.Client để LISTEN:", err);
    console.log("[MI-Worker] Chuyển hoàn toàn sang chế độ Polling dự phòng.");
  }

  // Quét ngay lần đầu khi vừa khởi động
  void processQueue();

  // Polling dự phòng định kỳ
  const intervalId = setInterval(() => {
    if (!isRunning) {
      clearInterval(intervalId);
      return;
    }
    void processQueue();
  }, POLL_INTERVAL_MS);

  // Xử lý tắt an toàn (Graceful Shutdown)
  const shutdown = async () => {
    console.log("[MI-Worker] Nhận tín hiệu dừng, đang đóng worker...");
    isRunning = false;
    clearInterval(intervalId);
    try {
      await pgClient.end();
      await prisma.$disconnect();
    } catch {
      // Bỏ qua lỗi ngắt kết nối
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
