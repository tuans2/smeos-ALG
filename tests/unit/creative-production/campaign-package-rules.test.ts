import { describe, expect, it } from "vitest"

import {
  canApprovePackage,
  evaluateCampaignQa,
  extractWinningPatterns,
  MIN_PACKAGES_FOR_PATTERNS,
  nextBestActions,
  PACKAGE_IDENTITY_SAFE,
  PACKAGE_IDENTITY_WARNING,
  statusFromQa,
  summarizePerformance,
  upcomingOccasions,
  type QaInput,
} from "@/modules/creative-production/domain/campaign-package-rules"
import { SUBJECT_IDENTITY_SAFE, SUBJECT_IDENTITY_WARNING } from "@/modules/media/domain/variant-rules"

// Khu vực F (Chặng 07–14) — luật thật thay cho QA "PASSED 99.9%" và số liệu gõ cứng.

const NOW = new Date("2026-09-23T10:00:00Z")

function base(overrides: Partial<QaInput> = {}): QaInput {
  return {
    posts: [{ channel: "facebook", text: "Bó hoa hồng đỏ tặng sinh nhật", hashtags: ["#hoatuoi"] }],
    variants: [
      { assetId: "a1", approvalState: "APPROVED", identityScore: 1, aspectRatio: "1:1", watermark: true },
    ],
    video: null,
    audio: null,
    brand: { hasLogo: true, forbiddenStyles: null },
    now: NOW,
    ...overrides,
  }
}

describe("evaluateCampaignQa (Chặng 08)", () => {
  it("gói đủ, số đo đạt → PASS", () => {
    const r = evaluateCampaignQa(base())
    expect(r.verdict).toBe("PASS")
    expect(r.checks).toHaveLength(5)
    expect(statusFromQa(r.verdict)).toBe("QA_PASSED")
  })

  it("không ảnh biến thể → REJECTED", () => {
    expect(evaluateCampaignQa(base({ variants: [] })).verdict).toBe("REJECTED")
  })

  it("lõi bó hoa dưới 0,99 → REJECTED; giữa 0,99 và 0,999 → NEEDS_REVIEW; chưa đo → NEEDS_REVIEW", () => {
    const v = (s: number | null) =>
      base({ variants: [{ assetId: "a1", approvalState: "APPROVED", identityScore: s, aspectRatio: "1:1", watermark: true }] })
    expect(evaluateCampaignQa(v(0.98)).verdict).toBe("REJECTED")
    expect(evaluateCampaignQa(v(0.995)).verdict).toBe("NEEDS_REVIEW")
    expect(evaluateCampaignQa(v(null)).verdict).toBe("NEEDS_REVIEW")
  })

  it("ngưỡng khớp với cổng Subject Integrity của M04b", () => {
    expect(PACKAGE_IDENTITY_SAFE).toBe(SUBJECT_IDENTITY_SAFE)
    expect(PACKAGE_IDENTITY_WARNING).toBe(SUBJECT_IDENTITY_WARNING)
  })

  it("ảnh chưa duyệt I5 / video chưa duyệt P4 → NEEDS_REVIEW; video FAILED → REJECTED", () => {
    expect(
      evaluateCampaignQa(
        base({ variants: [{ assetId: "a1", approvalState: "PENDING", identityScore: 1, aspectRatio: "1:1", watermark: true }] })
      ).verdict
    ).toBe("NEEDS_REVIEW")
    expect(
      evaluateCampaignQa(base({ video: { stage: "RENDER_COMPLETED", approval: "PENDING", aspectRatio: "9:16" } })).verdict
    ).toBe("NEEDS_REVIEW")
    expect(evaluateCampaignQa(base({ video: { stage: "FAILED", approval: "PENDING", aspectRatio: "9:16" } })).verdict).toBe(
      "REJECTED"
    )
  })

  it("TikTok thiếu nội dung 9:16 → NEEDS_REVIEW", () => {
    const r = evaluateCampaignQa(base({ posts: [{ channel: "tiktok", text: "Hoa đẹp", hashtags: [] }] }))
    expect(r.checks.find((c) => c.id === "platform_specs")?.verdict).toBe("NEEDS_REVIEW")
  })

  it("không có bài đăng, bài trống, vượt giới hạn, còn {{biến}} → REJECTED", () => {
    expect(evaluateCampaignQa(base({ posts: [] })).verdict).toBe("REJECTED")
    expect(evaluateCampaignQa(base({ posts: [{ channel: "facebook", text: "  ", hashtags: [] }] })).verdict).toBe("REJECTED")
    expect(
      evaluateCampaignQa(base({ posts: [{ channel: "zalo", text: "x".repeat(2100), hashtags: [] }] })).verdict
    ).toBe("REJECTED")
    expect(
      evaluateCampaignQa(base({ posts: [{ channel: "facebook", text: "Giá {{gia}}", hashtags: [] }] })).verdict
    ).toBe("REJECTED")
  })

  it("Instagram quá 30 hashtag → NEEDS_REVIEW", () => {
    const tags = Array.from({ length: 31 }, (_, i) => `#t${i}`)
    const r = evaluateCampaignQa(base({ posts: [{ channel: "instagram", text: "Hoa", hashtags: tags }] }))
    expect(r.checks.find((c) => c.id === "content")?.verdict).toBe("NEEDS_REVIEW")
  })

  it("chưa khai logo / không ảnh nào đóng dấu → NEEDS_REVIEW ở trục thương hiệu", () => {
    const r = evaluateCampaignQa(
      base({
        brand: { hasLogo: false, forbiddenStyles: null },
        variants: [{ assetId: "a1", approvalState: "APPROVED", identityScore: 1, aspectRatio: "1:1", watermark: false }],
      })
    )
    expect(r.checks.find((c) => c.id === "brand")?.verdict).toBe("NEEDS_REVIEW")
    expect(r.checks.find((c) => c.id === "brand")?.reasons).toHaveLength(2)
  })
})

describe("canApprovePackage (Chặng 09)", () => {
  it("DRAFT/REJECTED/APPROVED không duyệt được; NEEDS_REVIEW cần xác nhận; PASSED duyệt được", () => {
    expect(canApprovePackage("DRAFT", true).ok).toBe(false)
    expect(canApprovePackage("QA_REJECTED", true).ok).toBe(false)
    expect(canApprovePackage("APPROVED", true).ok).toBe(false)
    expect(canApprovePackage("QA_NEEDS_REVIEW", false).ok).toBe(false)
    expect(canApprovePackage("QA_NEEDS_REVIEW", true).ok).toBe(true)
    expect(canApprovePackage("QA_PASSED", false).ok).toBe(true)
  })
})

describe("summarizePerformance (Chặng 11–12)", () => {
  const approvedAt = new Date("2026-09-01T00:00:00Z")

  it("chỉ tính đơn sau ngày duyệt, bỏ DRAFT/CANCELLED; số liệu kênh chỉ của bài đã gắn", () => {
    const s = summarizePerformance({
      approvedAt,
      orders: [
        { createdAt: new Date("2026-08-30"), status: "COMPLETED", productRevenueVnd: 500000, productQuantity: 1 },
        { createdAt: new Date("2026-09-05"), status: "COMPLETED", productRevenueVnd: 600000, productQuantity: 1 },
        { createdAt: new Date("2026-09-06"), status: "CANCELLED", productRevenueVnd: 900000, productQuantity: 1 },
        { createdAt: new Date("2026-09-07"), status: "CONFIRMED", productRevenueVnd: 1200000, productQuantity: 2 },
      ],
      conversationsSince: 4,
      postRefs: [{ platform: "facebook", contentId: "p1" }],
      metrics: [
        { platform: "facebook", contentId: "p1", reach: 100, impressions: 200, engagement: 10, clicks: 3, conversions: null },
        { platform: "facebook", contentId: "p1", reach: 50, impressions: null, engagement: 5, clicks: null, conversions: null },
        { platform: "facebook", contentId: "khac", reach: 9999, impressions: 1, engagement: 1, clicks: 1, conversions: 1 },
      ],
    })
    expect(s.orders).toEqual({ count: 2, quantity: 3, revenueVnd: 1800000 })
    expect(s.conversations).toBe(4)
    expect(s.channel.reach).toBe(150)
    expect(s.channel.conversions).toBeNull()
    expect(s.channel.postsWithData).toBe(1)
  })

  it("chưa duyệt → không đếm gì, và nói rõ lý do", () => {
    const s = summarizePerformance({ approvedAt: null, orders: [], conversationsSince: 9, postRefs: [], metrics: [] })
    expect(s.orders.count).toBe(0)
    expect(s.conversations).toBe(0)
    expect(s.caveats.join(" ")).toContain("chưa được duyệt")
  })
})

describe("extractWinningPatterns (Chặng 13)", () => {
  it("dưới ngưỡng dữ liệu → INSUFFICIENT_DATA, không bịa kết luận", () => {
    const r = extractWinningPatterns([])
    expect(r).toEqual({ status: "INSUFFICIENT_DATA", have: 0, need: MIN_PACKAGES_FOR_PATTERNS })
  })

  it("đủ dữ liệu → chọn nhóm doanh thu trung bình cao nhất, cần ≥ 2 nhóm để so", () => {
    const r = extractWinningPatterns([
      { packageId: "1", angleCategory: "EMOTIONAL", scene2Preset: "wedding", hasVideo: true, revenueVnd: 3000000, orderCount: 5 },
      { packageId: "2", angleCategory: "EMOTIONAL", scene2Preset: "wedding", hasVideo: true, revenueVnd: 1000000, orderCount: 2 },
      { packageId: "3", angleCategory: "PRICE_VALUE", scene2Preset: "wedding", hasVideo: false, revenueVnd: 500000, orderCount: 1 },
    ])
    expect(r.status).toBe("OK")
    if (r.status !== "OK") return
    const angle = r.patterns.find((p) => p.dimension === "angleCategory")
    expect(angle?.value).toBe("EMOTIONAL")
    expect(angle?.avgRevenueVnd).toBe(2000000)
    // scene2Preset chỉ có MỘT nhóm → không phải phát hiện
    expect(r.patterns.find((p) => p.dimension === "scene2Preset")).toBeUndefined()
  })
})

describe("nextBestActions & upcomingOccasions (Chặng 14)", () => {
  it("dịp cố định trong 30 ngày tới", () => {
    const list = upcomingOccasions(new Date("2026-09-25T00:00:00Z"), 30)
    expect(list.map((o) => o.name)).toEqual(["Phụ nữ Việt Nam 20/10"])
    expect(list[0]?.daysLeft).toBe(25)
  })

  it("gói chưa duyệt → chỉ một việc: hoàn tất duyệt", () => {
    const perf = summarizePerformance({ approvedAt: null, orders: [], conversationsSince: 0, postRefs: [], metrics: [] })
    const a = nextBestActions({
      now: NOW,
      status: "QA_PASSED",
      approvedAt: null,
      hasVideo: false,
      postRefs: 0,
      performance: perf,
      learn: extractWinningPatterns([]),
      packageAngle: null,
    })
    expect(a.map((x) => x.id)).toEqual(["finish-approval"])
  })

  it("đã duyệt 10 ngày, chưa gắn bài, không video, không đơn → đề xuất dựa trên dữ kiện thật", () => {
    const approvedAt = new Date("2026-09-13T10:00:00Z")
    const perf = summarizePerformance({ approvedAt, orders: [], conversationsSince: 2, postRefs: [], metrics: [] })
    const ids = nextBestActions({
      now: NOW,
      status: "APPROVED",
      approvedAt,
      hasVideo: false,
      postRefs: 0,
      performance: perf,
      learn: extractWinningPatterns([]),
      packageAngle: "EMOTIONAL",
    }).map((x) => x.id)
    expect(ids).toEqual(expect.arrayContaining(["launch", "add-video", "try-another-topic", "follow-up-chat"]))
  })
})
