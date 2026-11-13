import { describe, it, expect } from "vitest";
import {
  computeTimeframeDistribution,
  filterByTimeframe,
  getOpportunityTimeframeMeta,
  generateDailyBuckets,
  generateWeeklyBuckets,
  generateMonthlyBuckets,
  generateQuarterlyBuckets,
  filterByPeriodBucket,
  findPeriodChampions,
} from "@/modules/market-intelligence/domain/trend-timeframe";

describe("trend-timeframe domain utility", () => {
  const baseDate = new Date("2026-09-24T12:00:00Z");
  const baseTime = baseDate.getTime();

  const mockItems = [
    { id: "1", createdAt: new Date(baseTime - 2 * 3600 * 1000).toISOString() }, // 2h ago (Hôm nay 24/09)
    { id: "2", createdAt: new Date(baseTime - 12 * 3600 * 1000).toISOString() }, // 12h ago (Hôm nay 24/09)
    { id: "3", createdAt: new Date(baseTime - 28 * 3600 * 1000).toISOString() }, // 28h ago (Hôm qua 23/09)
    { id: "4", createdAt: new Date(baseTime - 5 * 24 * 3600 * 1000).toISOString() }, // 5d ago (Tuần này)
    { id: "5", createdAt: new Date(baseTime - 12 * 24 * 3600 * 1000).toISOString() }, // 12d ago (Tuần trước)
    { id: "6", createdAt: new Date(baseTime - 40 * 24 * 3600 * 1000).toISOString() }, // 40d ago (Tháng trước)
  ];

  it("tính toán đúng phân bổ theo 4 khung thời gian", () => {
    const dist = computeTimeframeDistribution(mockItems, baseTime);
    expect(dist.day).toBe(2);
    expect(dist.week).toBe(4);
    expect(dist.month).toBe(5);
    expect(dist.quarter).toBe(6);
    expect(dist.all).toBe(6);
  });

  it("lọc chính xác theo từng khung thời gian rolling", () => {
    const dayItems = filterByTimeframe(mockItems, "DAY", baseTime);
    expect(dayItems.map((i) => i.id)).toEqual(["1", "2"]);

    const allItems = filterByTimeframe(mockItems, "ALL", baseTime);
    expect(allItems.length).toBe(6);
  });

  it("sinh danh sách DailyBuckets và lọc chính xác từng ngày cụ thể", () => {
    const dailyBuckets = generateDailyBuckets(mockItems, 7, baseDate);
    expect(dailyBuckets.length).toBe(7);

    // Hôm nay
    const todayBucket = dailyBuckets[0]!;
    expect(todayBucket.isCurrent).toBe(true);
    expect(todayBucket.label).toContain("Hôm nay");
    expect(todayBucket.count).toBe(2);

    const filteredToday = filterByPeriodBucket(mockItems, todayBucket);
    expect(filteredToday.map((i) => i.id)).toEqual(["1", "2"]);

    // Hôm qua
    const yesterdayBucket = dailyBuckets[1]!;
    expect(yesterdayBucket.label).toContain("Hôm qua");
    expect(yesterdayBucket.count).toBe(1);

    const filteredYesterday = filterByPeriodBucket(mockItems, yesterdayBucket);
    expect(filteredYesterday.map((i) => i.id)).toEqual(["3"]);
  });

  it("sinh danh sách WeeklyBuckets và lọc chính xác từng tuần cụ thể", () => {
    const weeklyBuckets = generateWeeklyBuckets(mockItems, 4, baseDate);
    expect(weeklyBuckets.length).toBe(4);

    const thisWeek = weeklyBuckets[0]!;
    expect(thisWeek.isCurrent).toBe(true);
    expect(thisWeek.label).toContain("Tuần này");
    expect(thisWeek.count).toBe(4); // items 1, 2, 3, 4 within past 7 days

    const lastWeek = weeklyBuckets[1]!;
    expect(lastWeek.label).toContain("Tuần trước");
    expect(lastWeek.count).toBe(1); // item 5 (12 days ago)
  });

  it("sinh danh sách MonthlyBuckets và lọc theo từng tháng cụ thể", () => {
    const monthlyBuckets = generateMonthlyBuckets(mockItems, 4, baseDate);
    expect(monthlyBuckets.length).toBe(4);

    const thisMonth = monthlyBuckets[0]!;
    expect(thisMonth.label).toContain("Tháng này");
    expect(thisMonth.count).toBe(5); // items 1, 2, 3, 4, 5 in Sep 2026

    const lastMonth = monthlyBuckets[1]!;
    expect(lastMonth.label).toContain("Tháng trước");
    expect(lastMonth.count).toBe(1); // item 6 in Aug 2026
  });

  it("sinh danh sách QuarterlyBuckets và lọc theo từng quý cụ thể", () => {
    const quarterlyBuckets = generateQuarterlyBuckets(mockItems, 4, baseDate);
    expect(quarterlyBuckets.length).toBe(4);

    const thisQuarter = quarterlyBuckets[0]!;
    expect(thisQuarter.label).toContain("Quý này");
    expect(thisQuarter.count).toBe(6); // all items are in Q3 2026
  });

  it("xác định đúng badge metadata theo độ tuổi của mục", () => {
    const dayMeta = getOpportunityTimeframeMeta(mockItems[0]!.createdAt, baseTime);
    expect(dayMeta.key).toBe("DAY");
    expect(dayMeta.label).toContain("24h qua");

    const weekMeta = getOpportunityTimeframeMeta(mockItems[3]!.createdAt, baseTime);
    expect(weekMeta.key).toBe("WEEK");
    expect(weekMeta.label).toContain("Tuần này");
  });

  it("tìm chính xác Top 1 của Tuần - Tháng - 3 Tháng - 6 Tháng - 1 Năm", () => {
    const scoredMockItems = [
      {
        id: "opp-w",
        topicName: "Bó hoa tốt nghiệp hướng dương",
        contentOpportunityScore: 88,
        trendScore: 85,
        viralScore: 90,
        commercialScore: 80,
        createdAt: new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString(), // 3 ngày qua (Tuần)
      },
      {
        id: "opp-m",
        topicName: "Hoa mẫu đơn nhập khẩu",
        contentOpportunityScore: 95,
        trendScore: 92,
        viralScore: 88,
        commercialScore: 94,
        createdAt: new Date(baseTime - 20 * 24 * 3600 * 1000).toISOString(), // 20 ngày qua (Tháng)
      },
      {
        id: "opp-q",
        topicName: "Hoa cưới tone cam cháy",
        contentOpportunityScore: 98,
        trendScore: 96,
        viralScore: 95,
        commercialScore: 97,
        createdAt: new Date(baseTime - 70 * 24 * 3600 * 1000).toISOString(), // 70 ngày qua (3 Tháng)
      },
    ];

    const champions = findPeriodChampions(scoredMockItems, baseTime);
    expect(champions.length).toBe(5);

    // Top 1 Tuần: chỉ có opp-w
    expect(champions[0]!.key).toBe("WEEK");
    expect(champions[0]!.item?.id).toBe("opp-w");

    // Top 1 Tháng: opp-m (95) vượt qua opp-w (88)
    expect(champions[1]!.key).toBe("MONTH");
    expect(champions[1]!.item?.id).toBe("opp-m");

    // Top 1 3 Tháng: opp-q (98) vượt qua opp-m (95) và opp-w (88)
    expect(champions[2]!.key).toBe("QUARTER");
    expect(champions[2]!.item?.id).toBe("opp-q");

    // Top 1 6 Tháng: opp-q vẫn dẫn đầu do tập dữ liệu mẫu chỉ có 3 mục
    expect(champions[3]!.key).toBe("HALF_YEAR");
    expect(champions[3]!.item?.id).toBe("opp-q");

    // Top 1 1 Năm: opp-q vẫn dẫn đầu
    expect(champions[4]!.key).toBe("YEAR");
    expect(champions[4]!.item?.id).toBe("opp-q");
  });

  it("đảm bảo 5 cúp Top 1 trao cho 5 chủ đề độc nhất không trùng lặp khi có đủ ứng viên", () => {
    const diverseItems = [
      {
        id: "opp-w1",
        topicName: "Hoa cưới tone cam cháy",
        contentOpportunityScore: 99,
        trendScore: 98,
        viralScore: 95,
        commercialScore: 99,
        createdAt: new Date(baseTime - 2 * 24 * 3600 * 1000).toISOString(), // 2d (Tuần)
      },
      {
        id: "opp-w2",
        topicName: "Hoa cưới tone cam cháy", // trùng topic
        contentOpportunityScore: 95,
        trendScore: 90,
        viralScore: 85,
        commercialScore: 92,
        createdAt: new Date(baseTime - 15 * 24 * 3600 * 1000).toISOString(), // 15d (Tháng)
      },
      {
        id: "opp-m1",
        topicName: "Hoa mẫu đơn hồng pastel",
        contentOpportunityScore: 94,
        trendScore: 91,
        viralScore: 89,
        commercialScore: 90,
        createdAt: new Date(baseTime - 20 * 24 * 3600 * 1000).toISOString(), // 20d (Tháng)
      },
      {
        id: "opp-q1",
        topicName: "Bó hoa tốt nghiệp hướng dương",
        contentOpportunityScore: 92,
        trendScore: 88,
        viralScore: 87,
        commercialScore: 88,
        createdAt: new Date(baseTime - 50 * 24 * 3600 * 1000).toISOString(), // 50d (3T)
      },
      {
        id: "opp-hy1",
        topicName: "Giỏ hoa khai trương rực rỡ",
        contentOpportunityScore: 90,
        trendScore: 86,
        viralScore: 85,
        commercialScore: 85,
        createdAt: new Date(baseTime - 120 * 24 * 3600 * 1000).toISOString(), // 120d (6T)
      },
      {
        id: "opp-y1",
        topicName: "Kệ hoa viếng lan hồ điệp",
        contentOpportunityScore: 88,
        trendScore: 84,
        viralScore: 83,
        commercialScore: 82,
        createdAt: new Date(baseTime - 250 * 24 * 3600 * 1000).toISOString(), // 250d (1N)
      },
    ];

    const champions = findPeriodChampions(diverseItems, baseTime);
    const chosenTopics = champions.map((c) => c.item?.topicName).filter(Boolean);

    // 5 cúp phải là 5 chủ đề hoàn toàn khác nhau
    const uniqueTopics = new Set(chosenTopics);
    expect(uniqueTopics.size).toBe(5);
    expect(champions[0]!.item?.topicName).toBe("Hoa cưới tone cam cháy");
    expect(champions[1]!.item?.topicName).toBe("Hoa mẫu đơn hồng pastel");
    expect(champions[2]!.item?.topicName).toBe("Bó hoa tốt nghiệp hướng dương");
    expect(champions[3]!.item?.topicName).toBe("Giỏ hoa khai trương rực rỡ");
    expect(champions[4]!.item?.topicName).toBe("Kệ hoa viếng lan hồ điệp");
  });
});

