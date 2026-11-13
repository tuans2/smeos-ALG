/**
 * Domain: Campaign Package — Khu vực F của Creative Studio (Chặng 07–14).
 *
 * 23/09/2026. Trước ngày này Chặng 07–09 chỉ là state phía trình duyệt: danh
 * sách tài sản luôn "READY", QA là bốn hằng "PASSED 99.9%", nút duyệt không ghi
 * gì; Chặng 10–14 hiển thị "34 đơn / 20.366.000đ" gõ cứng. File này là luật
 * THẬT, chạy trên dữ liệu thật do use-case nạp từ CSDL:
 *
 *   - `evaluateCampaignQa()`   — Chặng 08, năm trục kiểm, phán quyết xấu nhất thắng.
 *   - `canApprovePackage()`     — Chặng 09, cổng duyệt.
 *   - `summarizePerformance()`  — Chặng 11–12, số đo thật (đơn, doanh thu, số liệu kênh).
 *   - `extractWinningPatterns()`— Chặng 13, chỉ kết luận khi đủ dữ liệu.
 *   - `nextBestActions()`       — Chặng 14, luật dựa trên dữ kiện thật, không bịa số.
 *
 * Thuần TypeScript — không import Prisma.
 */

import { checkFlowerContent } from "@/core/ai/domain/flower-content-guard"

// ============================================================
// 1. TRẠNG THÁI & KÊNH
// ============================================================

export const CAMPAIGN_PACKAGE_STATUSES = [
  "DRAFT",
  "QA_PASSED",
  "QA_NEEDS_REVIEW",
  "QA_REJECTED",
  "APPROVED",
] as const
export type CampaignPackageStatus = (typeof CAMPAIGN_PACKAGE_STATUSES)[number]

export const PACKAGE_CHANNELS = ["facebook", "instagram", "tiktok", "zalo"] as const
export type PackageChannel = (typeof PACKAGE_CHANNELS)[number]

export interface PackagePost {
  readonly channel: PackageChannel
  readonly text: string
  readonly hashtags: readonly string[]
}

/** Giới hạn ký tự bài đăng theo kênh (mức thận trọng; nền tảng có thể nới). */
export const CHANNEL_TEXT_LIMITS: Readonly<Record<PackageChannel, number>> = {
  facebook: 63206,
  instagram: 2200,
  tiktok: 2200,
  zalo: 2000,
}

/** Instagram từ chối bài có quá 30 hashtag. */
export const INSTAGRAM_MAX_HASHTAGS = 30

/** Tỷ lệ khung ảnh/video chấp nhận được cho từng kênh. */
export const CHANNEL_RATIOS: Readonly<Record<PackageChannel, readonly string[]>> = {
  facebook: ["1:1", "4:5", "16:9"],
  instagram: ["1:1", "4:5"],
  tiktok: ["9:16"],
  zalo: ["1:1", "4:5", "16:9"],
}

// Ngưỡng Subject Integrity — cùng `variant-rules.ts` (không import để domain
// creative-production không phụ thuộc module media; test khoá hai bên khớp).
export const PACKAGE_IDENTITY_SAFE = 0.999
export const PACKAGE_IDENTITY_WARNING = 0.99

// ============================================================
// 2. QA (Chặng 08)
// ============================================================

export type QaVerdict = "PASS" | "NEEDS_REVIEW" | "REJECTED"

export interface QaCheck {
  readonly id: "product_integrity" | "approvals" | "platform_specs" | "content" | "brand" | "plan_consistency" | "scope_coverage"
  readonly title: string
  readonly verdict: QaVerdict
  readonly reasons: readonly string[]
}

export interface QaReport {
  readonly verdict: QaVerdict
  readonly checks: readonly QaCheck[]
  readonly checkedAt: string
}

export interface QaVariantInput {
  readonly assetId: string
  readonly approvalState: string
  readonly identityScore: number | null
  readonly aspectRatio: string | null
  readonly watermark: boolean
  /** Kịch bản + phiên bản lúc sinh ảnh (metadata Khu vực D). */
  readonly scenePlanId?: string | null | undefined
  readonly scenePlanRevision?: number | null | undefined
}

/** Tài sản đối chiếu kịch bản sản xuất tổng (Đợt 5, 24/09/2026). */
export interface QaPlanLink {
  readonly scenePlanId: string | null
  readonly scenePlanRevision: number | null
}

export type QaVideoInput = { readonly stage: string; readonly approval: string; readonly aspectRatio: string } & Partial<QaPlanLink> & {
  /** Video dùng nguyên bản phối Khu vực C (Đợt 4). */
  readonly usesPlanAudio?: boolean | undefined
}

/** Phạm vi sản xuất đã chọn ở Chặng 04/05 (PO 24/09/2026). */
export interface QaScope {
  /** Loại kết quả phải có (đã gồm loại tự thêm vì video cần). */
  readonly produce: readonly ("content" | "audio" | "image" | "video")[]
  /** Mỗi khung một bộ ảnh + một video. */
  readonly ratios: readonly string[]
  /** Kênh phải có bài đăng (khi có content). */
  readonly postChannels: readonly string[]
}

export interface QaInput {
  readonly posts: readonly PackagePost[]
  readonly variants: readonly QaVariantInput[]
  /** `null` = gói không kèm video. Gói nhiều video dùng `videos`. */
  readonly video: QaVideoInput | null
  /** Mọi video của gói (mỗi khung một video) — có thì thay cho `video`. */
  readonly videos?: readonly QaVideoInput[] | undefined
  /** `null` = gói không kèm audio. */
  readonly audio: ({ readonly stage: string } & Partial<QaPlanLink>) | null
  /** Kịch bản sản xuất tổng của gói (bản hiện hành). `null` = gói cũ, bỏ qua trục đồng nhất. */
  readonly plan?: { readonly scenePlanId: string; readonly revision: number; readonly scope?: QaScope | undefined } | null | undefined
  readonly brand: { readonly hasLogo: boolean; readonly forbiddenStyles: string | null }
  readonly now: Date
}

const ORDER: Record<QaVerdict, number> = { PASS: 0, NEEDS_REVIEW: 1, REJECTED: 2 }

export function worstVerdict(verdicts: readonly QaVerdict[]): QaVerdict {
  return verdicts.reduce<QaVerdict>((acc, v) => (ORDER[v] > ORDER[acc] ? v : acc), "PASS")
}

function check(id: QaCheck["id"], title: string, reasons: { v: QaVerdict; msg: string }[]): QaCheck {
  return {
    id,
    title,
    verdict: worstVerdict(reasons.map((r) => r.v)),
    reasons: reasons.filter((r) => r.v !== "PASS").map((r) => r.msg),
  }
}

export function evaluateCampaignQa(input: QaInput): QaReport {
  const videos: readonly QaVideoInput[] = input.videos ?? (input.video ? [input.video] : [])
  const scope = input.plan?.scope ?? null
  // Có phạm vi: chỉ đòi loại kết quả đã chọn. Gói cũ (không phạm vi): đòi đủ như trước.
  const wants = (o: QaScope["produce"][number]) => !scope || scope.produce.includes(o)
  const many = videos.length > 1
  // 1. Toàn vẹn sản phẩm — số ĐO của worker, không phải hằng.
  const integrity: { v: QaVerdict; msg: string }[] = []
  if (input.variants.length === 0 && wants("image")) {
    integrity.push({ v: "REJECTED", msg: "Gói chưa có ảnh biến thể nào (Khu vực D)." })
  }
  for (const v of input.variants) {
    const short = v.assetId.slice(0, 8)
    if (v.identityScore === null) {
      integrity.push({ v: "NEEDS_REVIEW", msg: `Ảnh ${short} chưa có số đo Subject Integrity.` })
    } else if (v.identityScore < PACKAGE_IDENTITY_WARNING) {
      integrity.push({
        v: "REJECTED",
        msg: `Ảnh ${short}: lõi sản phẩm chỉ còn ${(v.identityScore * 100).toFixed(2)}% trùng khít Master.`,
      })
    } else if (v.identityScore < PACKAGE_IDENTITY_SAFE) {
      integrity.push({
        v: "NEEDS_REVIEW",
        msg: `Ảnh ${short}: lõi sản phẩm lệch nhẹ (${(v.identityScore * 100).toFixed(2)}%) — xem kỹ trước khi đăng.`,
      })
    }
  }

  // 2. Cổng duyệt từng tài sản (I5 / P4).
  const approvals: { v: QaVerdict; msg: string }[] = []
  const chuaDuyet = input.variants.filter((v) => v.approvalState !== "APPROVED")
  if (chuaDuyet.length > 0) {
    approvals.push({
      v: "NEEDS_REVIEW",
      msg: `${chuaDuyet.length} ảnh biến thể chưa được duyệt (I5).`,
    })
  }
  for (const video of videos) {
    const label = many ? `Video ${video.aspectRatio}` : "Video"
    if (video.stage === "FAILED" || video.stage === "REJECTED") {
      approvals.push({ v: "REJECTED", msg: `${label} ở trạng thái ${video.stage}.` })
    } else if (video.approval !== "APPROVED") {
      approvals.push({ v: "NEEDS_REVIEW", msg: `${label} thành phẩm chưa được duyệt (P4).` })
    }
  }
  if (input.audio) {
    if (input.audio.stage === "FAILED") {
      approvals.push({ v: "REJECTED", msg: "Bản phối âm thanh bị lỗi." })
    } else if (input.audio.stage !== "COMPLETED") {
      approvals.push({ v: "NEEDS_REVIEW", msg: "Bản phối âm thanh chưa hoàn tất." })
    }
  }

  // 3. Chuẩn kênh — mỗi kênh có bài phải có ít nhất một tài sản đúng tỷ lệ.
  const specs: { v: QaVerdict; msg: string }[] = []
  const ratios = new Set<string>(
    input.variants.map((v) => v.aspectRatio).filter((r): r is string => Boolean(r))
  )
  const videoRatios = videos.filter((v) => v.stage !== "FAILED").map((v) => v.aspectRatio)
  for (const post of input.posts) {
    const allowed = CHANNEL_RATIOS[post.channel]
    const coVideo = videoRatios.some((r) => allowed.includes(r))
    const coAnh = allowed.some((r) => ratios.has(r))
    if (post.channel === "tiktok" && !coVideo && !coAnh) {
      specs.push({ v: "NEEDS_REVIEW", msg: "TikTok cần video hoặc ảnh 9:16 — gói chưa có." })
    } else if (!coVideo && !coAnh) {
      specs.push({
        v: "NEEDS_REVIEW",
        msg: `${post.channel}: chưa có ảnh/video tỷ lệ ${allowed.join(" / ")}.`,
      })
    }
  }

  // 4. Nội dung — đủ bài, trong giới hạn, không vi phạm từ điển ngành hoa.
  const content: { v: QaVerdict; msg: string }[] = []
  if (input.posts.length === 0 && wants("content")) {
    content.push({ v: "REJECTED", msg: "Gói chưa có bài đăng nào (Khu vực B)." })
  }
  for (const post of input.posts) {
    const text = post.text.trim()
    if (!text) {
      content.push({ v: "REJECTED", msg: `${post.channel}: nội dung trống.` })
      continue
    }
    const full = [text, ...post.hashtags].join(" ")
    if (full.length > CHANNEL_TEXT_LIMITS[post.channel]) {
      content.push({
        v: "REJECTED",
        msg: `${post.channel}: ${full.length} ký tự, vượt giới hạn ${CHANNEL_TEXT_LIMITS[post.channel]}.`,
      })
    }
    if (/\{\{[^}]*\}\}/.test(text)) {
      content.push({ v: "REJECTED", msg: `${post.channel}: còn biến mẫu {{...}} chưa điền.` })
    }
    if (post.channel === "instagram" && post.hashtags.length > INSTAGRAM_MAX_HASHTAGS) {
      content.push({
        v: "NEEDS_REVIEW",
        msg: `instagram: ${post.hashtags.length} hashtag, Instagram chỉ nhận tối đa ${INSTAGRAM_MAX_HASHTAGS}.`,
      })
    }
    const guard = checkFlowerContent(full, { brandForbiddenStyles: input.brand.forbiddenStyles })
    for (const m of guard.hardBlocks) {
      content.push({ v: "REJECTED", msg: `${post.channel}: "${m.phrase}" — ${m.reason}` })
    }
    for (const m of guard.warnings) {
      content.push({ v: "NEEDS_REVIEW", msg: `${post.channel}: "${m.phrase}" — ${m.reason}` })
    }
  }

  // 5. Thương hiệu.
  const brand: { v: QaVerdict; msg: string }[] = []
  if (!input.brand.hasLogo) {
    brand.push({ v: "NEEDS_REVIEW", msg: "Tiệm chưa khai logo trong Hồ sơ thương hiệu." })
  }
  if (input.variants.length > 0 && !input.variants.some((v) => v.watermark)) {
    brand.push({ v: "NEEDS_REVIEW", msg: "Chưa ảnh nào đóng dấu thương hiệu." })
  }

  // 6. Đồng nhất kịch bản (Đợt 5, quyết định PO 24/09/2026): mọi tài sản phải
  // sinh từ CÙNG kịch bản sản xuất tổng, đúng phiên bản hiện hành.
  const consistency: { v: QaVerdict; msg: string }[] = []
  const plan = input.plan ?? null
  if (plan) {
    const cu = (label: string, link: Partial<QaPlanLink>) => {
      if (link.scenePlanId && link.scenePlanId !== plan.scenePlanId) {
        consistency.push({ v: "NEEDS_REVIEW", msg: `${label} thuộc kịch bản khác của gói.` })
      } else if (!link.scenePlanId) {
        consistency.push({ v: "NEEDS_REVIEW", msg: `${label} không gắn kịch bản sản xuất (tạo ngoài Chặng 05).` })
      } else if (link.scenePlanRevision != null && link.scenePlanRevision < plan.revision) {
        consistency.push({
          v: "NEEDS_REVIEW",
          msg: `${label} làm theo kịch bản phiên bản ${link.scenePlanRevision}, kịch bản hiện là ${plan.revision}.`,
        })
      }
    }
    for (const v of input.variants) cu(`Ảnh ${v.assetId.slice(0, 8)}`, { scenePlanId: v.scenePlanId ?? null, scenePlanRevision: v.scenePlanRevision ?? null })
    if (input.audio) cu("Bản âm thanh", input.audio)
    for (const video of videos) {
      const label = many ? `Video ${video.aspectRatio}` : "Video"
      cu(label, video)
      if (video.usesPlanAudio === false) {
        consistency.push({ v: "NEEDS_REVIEW", msg: `${label} tự đọc lại lời thoại, không dùng bản phối Khu vực C — dựng lại bằng "Dựng video từ bộ tài sản".` })
      }
    }
  }

  // 7. Đủ phạm vi đã chọn (PO 24/09/2026): mỗi loại kết quả đã chọn phải có,
  // mỗi khung một bộ ảnh + một video, mỗi kênh một bài.
  const coverage: { v: QaVerdict; msg: string }[] = []
  if (scope) {
    if (scope.produce.includes("content")) {
      const have = new Set(input.posts.map((p) => p.channel as string))
      const missing = scope.postChannels.filter((c) => !have.has(c))
      if (missing.length > 0) coverage.push({ v: "REJECTED", msg: `Thiếu bài đăng cho ${missing.join(", ")} (Khu vực B).` })
    }
    if (scope.produce.includes("audio") && !input.audio) {
      coverage.push({ v: "REJECTED", msg: "Thiếu bản âm thanh (Khu vực C)." })
    }
    if (scope.produce.includes("image")) {
      const have = new Set(input.variants.map((v) => v.aspectRatio).filter(Boolean))
      const missing = scope.ratios.filter((r) => !have.has(r))
      if (missing.length > 0) coverage.push({ v: "REJECTED", msg: `Thiếu ảnh khung ${missing.join(", ")} (Khu vực D).` })
    }
    if (scope.produce.includes("video")) {
      const have = new Set(videos.map((v) => v.aspectRatio))
      const missing = scope.ratios.filter((r) => !have.has(r))
      if (missing.length > 0) coverage.push({ v: "REJECTED", msg: `Thiếu video khung ${missing.join(", ")} (Khu vực E).` })
    }
  }

  const checks: QaCheck[] = [
    check("product_integrity", "Toàn vẹn sản phẩm (Subject Integrity đo thật)", integrity),
    check("approvals", "Cổng duyệt từng tài sản (I5 · P4)", approvals),
    check("platform_specs", "Chuẩn tỷ lệ theo kênh", specs),
    check("content", "Nội dung & từ điển ngành hoa", content),
    check("brand", "Nhận diện thương hiệu", brand),
    ...(plan ? [check("plan_consistency", "Đồng nhất kịch bản sản xuất (Chặng 05)", consistency)] : []),
    ...(scope ? [check("scope_coverage", "Đủ phạm vi đã chọn (nền tảng + loại kết quả)", coverage)] : []),
  ]

  return {
    verdict: worstVerdict(checks.map((c) => c.verdict)),
    checks,
    checkedAt: input.now.toISOString(),
  }
}

export function statusFromQa(verdict: QaVerdict): CampaignPackageStatus {
  if (verdict === "PASS") return "QA_PASSED"
  if (verdict === "NEEDS_REVIEW") return "QA_NEEDS_REVIEW"
  return "QA_REJECTED"
}

// ============================================================
// 3. DUYỆT (Chặng 09)
// ============================================================

export type ApproveDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

/**
 * Chỉ duyệt được gói đã chạy QA. `QA_REJECTED` không bao giờ duyệt được;
 * `QA_NEEDS_REVIEW` cần người duyệt xác nhận đã xem các cảnh báo.
 */
export function canApprovePackage(
  status: CampaignPackageStatus,
  acknowledgeWarnings: boolean
): ApproveDecision {
  if (status === "APPROVED") return { ok: false, reason: "Gói đã được duyệt." }
  if (status === "DRAFT") return { ok: false, reason: "Chạy kiểm định QA (Chặng 08) trước khi duyệt." }
  if (status === "QA_REJECTED") {
    return { ok: false, reason: "QA từ chối gói này — sửa các lỗi rồi chạy lại QA." }
  }
  if (status === "QA_NEEDS_REVIEW" && !acknowledgeWarnings) {
    return { ok: false, reason: "Gói còn cảnh báo QA — xác nhận đã xem trước khi duyệt." }
  }
  return { ok: true }
}

/** Sửa nội dung/tài sản sau QA thì kết quả QA cũ không còn giá trị. */
export function canEditPackage(status: CampaignPackageStatus): boolean {
  return status !== "APPROVED"
}

// ============================================================
// 4. KẾ HOẠCH ĐĂNG (Chặng 10)
// ============================================================

export interface PostRef {
  readonly platform: PackageChannel
  /** Mã bài đăng bên hệ đăng bài (SocialFlow M07) — khớp `content_metrics.content_id`. */
  readonly contentId: string
}

export interface LaunchPlan {
  readonly channels: readonly PackageChannel[]
  readonly scheduledAt: string | null
  readonly postRefs: readonly PostRef[]
}

// ============================================================
// 5. SỐ ĐO THẬT (Chặng 11–12)
// ============================================================

export interface OrderFact {
  readonly createdAt: Date
  readonly status: string
  /** Doanh thu phần dòng hàng của ĐÚNG sản phẩm trong gói. */
  readonly productRevenueVnd: number
  readonly productQuantity: number
}

export interface MetricFact {
  readonly platform: string
  readonly contentId: string
  readonly reach: number | null
  readonly impressions: number | null
  readonly engagement: number | null
  readonly clicks: number | null
  readonly conversions: number | null
}

export interface PerformanceSummary {
  readonly since: string | null
  readonly orders: {
    readonly count: number
    readonly quantity: number
    readonly revenueVnd: number
  }
  readonly conversations: number
  readonly channel: {
    readonly linkedPosts: number
    readonly postsWithData: number
    readonly reach: number | null
    readonly impressions: number | null
    readonly engagement: number | null
    readonly clicks: number | null
    readonly conversions: number | null
  }
  /** Ranh giới trung thực của số đo — hiển thị nguyên văn trên giao diện. */
  readonly caveats: readonly string[]
}

const DON_KHONG_TINH = new Set(["DRAFT", "CANCELLED"])

function tong(values: readonly (number | null)[]): number | null {
  const co = values.filter((v): v is number => typeof v === "number")
  return co.length === 0 ? null : co.reduce((a, b) => a + b, 0)
}

export function summarizePerformance(input: {
  readonly approvedAt: Date | null
  readonly orders: readonly OrderFact[]
  readonly conversationsSince: number
  readonly postRefs: readonly PostRef[]
  readonly metrics: readonly MetricFact[]
}): PerformanceSummary {
  const since = input.approvedAt
  const orders = since
    ? input.orders.filter((o) => o.createdAt >= since && !DON_KHONG_TINH.has(o.status))
    : []
  const refKeys = new Set(input.postRefs.map((r) => `${r.platform}:${r.contentId}`))
  const metrics = input.metrics.filter((m) => refKeys.has(`${m.platform}:${m.contentId}`))
  const postsWithData = new Set(metrics.map((m) => `${m.platform}:${m.contentId}`)).size

  const caveats: string[] = []
  if (!since) caveats.push("Gói chưa được duyệt — chưa có mốc để đo.")
  caveats.push(
    "Đơn hàng tính theo sản phẩm của gói kể từ ngày duyệt — chưa quy được từng đơn về một bài đăng cụ thể."
  )
  caveats.push("Hội thoại tính toàn tiệm kể từ ngày duyệt.")
  if (input.postRefs.length === 0) {
    caveats.push("Chưa gắn mã bài đăng nào (Chặng 10) — chưa có số liệu kênh.")
  } else if (postsWithData === 0) {
    caveats.push("Đã gắn bài đăng nhưng chưa nhận số liệu kênh nào (content_metrics).")
  }

  return {
    since: since ? since.toISOString() : null,
    orders: {
      count: orders.length,
      quantity: orders.reduce((a, o) => a + o.productQuantity, 0),
      revenueVnd: Math.round(orders.reduce((a, o) => a + o.productRevenueVnd, 0)),
    },
    conversations: since ? input.conversationsSince : 0,
    channel: {
      linkedPosts: input.postRefs.length,
      postsWithData,
      reach: tong(metrics.map((m) => m.reach)),
      impressions: tong(metrics.map((m) => m.impressions)),
      engagement: tong(metrics.map((m) => m.engagement)),
      clicks: tong(metrics.map((m) => m.clicks)),
      conversions: tong(metrics.map((m) => m.conversions)),
    },
    caveats,
  }
}

// ============================================================
// 6. WINNING PATTERNS (Chặng 13)
// ============================================================

/** Số gói tối thiểu có số đo trước khi dám nói "mẫu thắng". */
export const MIN_PACKAGES_FOR_PATTERNS = 3

export interface PackageOutcome {
  readonly packageId: string
  readonly angleCategory: string | null
  readonly scene2Preset: string | null
  readonly hasVideo: boolean
  readonly revenueVnd: number
  readonly orderCount: number
}

export interface WinningPattern {
  readonly dimension: "angleCategory" | "scene2Preset" | "hasVideo"
  readonly value: string
  readonly packages: number
  readonly avgRevenueVnd: number
  readonly avgOrders: number
}

export type LearnResult =
  | { readonly status: "INSUFFICIENT_DATA"; readonly have: number; readonly need: number }
  | { readonly status: "OK"; readonly basedOn: number; readonly patterns: readonly WinningPattern[] }

export function extractWinningPatterns(outcomes: readonly PackageOutcome[]): LearnResult {
  if (outcomes.length < MIN_PACKAGES_FOR_PATTERNS) {
    return { status: "INSUFFICIENT_DATA", have: outcomes.length, need: MIN_PACKAGES_FOR_PATTERNS }
  }
  const dims: WinningPattern["dimension"][] = ["angleCategory", "scene2Preset", "hasVideo"]
  const patterns: WinningPattern[] = []
  for (const dim of dims) {
    const groups = new Map<string, PackageOutcome[]>()
    for (const o of outcomes) {
      const raw = dim === "hasVideo" ? (o.hasVideo ? "có video" : "không video") : o[dim]
      if (!raw) continue
      groups.set(raw, [...(groups.get(raw) ?? []), o])
    }
    let best: WinningPattern | null = null
    for (const [value, list] of groups) {
      const avgRevenueVnd = Math.round(list.reduce((a, o) => a + o.revenueVnd, 0) / list.length)
      const avgOrders = list.reduce((a, o) => a + o.orderCount, 0) / list.length
      const cand: WinningPattern = { dimension: dim, value, packages: list.length, avgRevenueVnd, avgOrders }
      if (!best || cand.avgRevenueVnd > best.avgRevenueVnd) best = cand
    }
    // Chỉ báo "thắng" khi có ít nhất hai nhóm để so — một nhóm duy nhất không phải phát hiện.
    if (best && groups.size >= 2 && best.avgRevenueVnd > 0) patterns.push(best)
  }
  return { status: "OK", basedOn: outcomes.length, patterns }
}

// ============================================================
// 7. NEXT BEST ACTION (Chặng 14)
// ============================================================

/** Dịp tặng hoa cố định theo dương lịch ở Việt Nam. */
export const VN_FIXED_OCCASIONS: readonly { readonly month: number; readonly day: number; readonly name: string }[] = [
  { month: 2, day: 14, name: "Lễ Tình nhân 14/2" },
  { month: 3, day: 8, name: "Quốc tế Phụ nữ 8/3" },
  { month: 10, day: 20, name: "Phụ nữ Việt Nam 20/10" },
  { month: 11, day: 20, name: "Nhà giáo Việt Nam 20/11" },
  { month: 12, day: 24, name: "Giáng sinh 24/12" },
]

export function upcomingOccasions(now: Date, withinDays: number) {
  const out: { name: string; date: string; daysLeft: number }[] = []
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  for (const o of VN_FIXED_OCCASIONS) {
    for (const year of [now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
      const d = Date.UTC(year, o.month - 1, o.day)
      const daysLeft = Math.round((d - start) / 86_400_000)
      if (daysLeft >= 0 && daysLeft <= withinDays) {
        out.push({ name: o.name, date: new Date(d).toISOString().slice(0, 10), daysLeft })
      }
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft)
}

export interface NextAction {
  readonly id: string
  readonly title: string
  readonly why: string
  /** Khu vực Creative Studio hoặc route để làm việc này. */
  readonly target: "area-b" | "area-d" | "area-e" | "area-f" | "/lich-dang" | "/hoi-thoai"
}

export function nextBestActions(input: {
  readonly now: Date
  readonly status: CampaignPackageStatus
  readonly approvedAt: Date | null
  readonly hasVideo: boolean
  readonly postRefs: number
  readonly performance: PerformanceSummary
  readonly learn: LearnResult
  readonly packageAngle: string | null
}): NextAction[] {
  const actions: NextAction[] = []
  if (input.status !== "APPROVED") {
    actions.push({
      id: "finish-approval",
      title: "Hoàn tất QA và duyệt gói",
      why: "Gói chưa được duyệt nên chưa thể đăng và đo hiệu quả.",
      target: "area-f",
    })
    return actions
  }
  if (input.postRefs === 0) {
    actions.push({
      id: "launch",
      title: "Đăng hoặc lên lịch bài, rồi gắn mã bài vào gói",
      why: "Chưa có bài đăng nào được gắn — không đo được hiệu quả kênh.",
      target: "/lich-dang",
    })
  }
  if (!input.hasVideo) {
    actions.push({
      id: "add-video",
      title: "Dựng thêm video 9:16 cho TikTok/Reels",
      why: "Gói chưa có video; TikTok chỉ nhận nội dung dọc 9:16.",
      target: "area-e",
    })
  }
  const daysSince = input.approvedAt
    ? Math.floor((input.now.getTime() - input.approvedAt.getTime()) / 86_400_000)
    : 0
  if (input.approvedAt && daysSince >= 7 && input.performance.orders.count === 0) {
    actions.push({
      id: "try-another-topic",
      title: "Thử chủ đề khác trong 10 chủ đề của Chặng 04",
      why: `Đã ${daysSince} ngày kể từ khi duyệt mà chưa có đơn nào cho sản phẩm này.`,
      target: "area-b",
    })
  }
  if (input.performance.conversations > 0 && input.performance.orders.count === 0) {
    actions.push({
      id: "follow-up-chat",
      title: "Rà lại hội thoại chưa chốt đơn",
      why: `${input.performance.conversations} hội thoại mới kể từ khi duyệt nhưng chưa có đơn cho sản phẩm này.`,
      target: "/hoi-thoai",
    })
  }
  if (input.learn.status === "OK") {
    const angle = input.learn.patterns.find((p) => p.dimension === "angleCategory")
    if (angle && input.packageAngle && angle.value !== input.packageAngle) {
      actions.push({
        id: "reuse-winning-angle",
        title: `Tạo gói mới theo góc tiếp cận "${angle.value}"`,
        why: `Góc này có doanh thu trung bình ${angle.avgRevenueVnd.toLocaleString("vi-VN")}đ/gói trên ${angle.packages} gói của tiệm.`,
        target: "area-b",
      })
    }
  }
  for (const o of upcomingOccasions(input.now, 30)) {
    actions.push({
      id: `occasion-${o.date}`,
      title: `Chuẩn bị nội dung cho ${o.name}`,
      why: `Còn ${o.daysLeft} ngày (${o.date}).`,
      target: "area-b",
    })
  }
  return actions
}
