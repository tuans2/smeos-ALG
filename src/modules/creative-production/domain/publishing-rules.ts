/**
 * Nền tảng đăng → tỉ lệ khung → khuôn video → kênh bài đăng (24/09/2026).
 *
 * Quyết định PO: ảnh/video sinh theo NỀN TẢNG người dùng chọn ở Chặng 05
 * (chỉ chọn TikTok thì chỉ làm dạng TikTok, chỉ chọn YouTube thì chỉ làm dạng
 * YouTube). Hiện tại mặc định 9:16 để tránh sinh nhiều tỉ lệ, nhưng bảng dưới
 * dựng sẵn cấu hình cho mọi tỉ lệ (9:16, 4:5, 1:1, 16:9).
 *
 * Thuần — không import hạ tầng.
 */

export const PUBLISH_PLATFORMS = [
  "tiktok",
  "instagram_reels",
  "facebook_reels",
  "youtube_shorts",
  "zalo_video",
  "youtube",
  "facebook_feed",
  "instagram_feed",
] as const
export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number]

export const PUBLISH_RATIOS = ["9:16", "4:5", "1:1", "16:9"] as const
export type PublishRatio = (typeof PUBLISH_RATIOS)[number]

/** Khuôn video (khớp enum `video_format` của Prisma). */
export type PublishVideoFormat = "REEL_15S" | "TIKTOK_30S" | "STORY_15S" | "SLIDESHOW" | "PRODUCT_PAGE" | "AD_MOTION"

/** Kênh bài đăng của gói chiến dịch (`PACKAGE_CHANNELS`). */
export type PublishPostChannel = "facebook" | "instagram" | "tiktok" | "zalo"

export interface PlatformSpec {
  readonly platform: PublishPlatform
  readonly label: string
  readonly ratio: PublishRatio
  readonly videoFormat: PublishVideoFormat
  /** Thời lượng video khuyến nghị cho nền tảng (giây). */
  readonly targetSeconds: number
  /** Kênh bài đăng đi kèm (chú thích/caption khi đăng). */
  readonly postChannel: PublishPostChannel | null
}

export const PLATFORM_SPECS: Readonly<Record<PublishPlatform, PlatformSpec>> = {
  tiktok: { platform: "tiktok", label: "TikTok", ratio: "9:16", videoFormat: "TIKTOK_30S", targetSeconds: 20, postChannel: "tiktok" },
  instagram_reels: { platform: "instagram_reels", label: "Instagram Reels", ratio: "9:16", videoFormat: "REEL_15S", targetSeconds: 15, postChannel: "instagram" },
  facebook_reels: { platform: "facebook_reels", label: "Facebook Reels", ratio: "9:16", videoFormat: "REEL_15S", targetSeconds: 15, postChannel: "facebook" },
  youtube_shorts: { platform: "youtube_shorts", label: "YouTube Shorts", ratio: "9:16", videoFormat: "TIKTOK_30S", targetSeconds: 20, postChannel: null },
  zalo_video: { platform: "zalo_video", label: "Zalo Video", ratio: "9:16", videoFormat: "STORY_15S", targetSeconds: 15, postChannel: "zalo" },
  youtube: { platform: "youtube", label: "YouTube (ngang)", ratio: "16:9", videoFormat: "SLIDESHOW", targetSeconds: 20, postChannel: null },
  facebook_feed: { platform: "facebook_feed", label: "Facebook Feed", ratio: "4:5", videoFormat: "SLIDESHOW", targetSeconds: 15, postChannel: "facebook" },
  instagram_feed: { platform: "instagram_feed", label: "Instagram Feed", ratio: "4:5", videoFormat: "SLIDESHOW", targetSeconds: 15, postChannel: "instagram" },
}

/** Mặc định mỗi lần mở (PO 24/09/2026): TikTok + Reels, khung 9:16. */
export const DEFAULT_PLATFORMS: readonly PublishPlatform[] = ["tiktok", "instagram_reels", "facebook_reels"]
export const DEFAULT_RATIO: PublishRatio = "9:16"

/** Loại kết quả sản xuất (PO 24/09/2026 tối). */
export const PRODUCTION_OUTPUTS = ["content", "audio", "image", "video"] as const
export type ProductionOutput = (typeof PRODUCTION_OUTPUTS)[number]

/** Giá trị đặc biệt "Tất cả" — gửi từ giao diện khi người dùng bấm "Tất cả". */
export const ALL = "all" as const

export function isPublishPlatform(v: unknown): v is PublishPlatform {
  return typeof v === "string" && (PUBLISH_PLATFORMS as readonly string[]).includes(v)
}

export function isProductionOutput(v: unknown): v is ProductionOutput {
  return typeof v === "string" && (PRODUCTION_OUTPUTS as readonly string[]).includes(v)
}

export interface VideoVariantPlan {
  readonly ratio: PublishRatio
  readonly videoFormat: PublishVideoFormat
  readonly targetSeconds: number
  readonly platforms: readonly PublishPlatform[]
}

export interface PublishingPlan {
  readonly platforms: readonly PublishPlatform[]
  readonly allPlatforms: boolean
  /** Loại kết quả NGƯỜI DÙNG chọn. */
  readonly outputs: readonly ProductionOutput[]
  readonly allOutputs: boolean
  /** Loại kết quả hệ thống tự thêm vì phụ thuộc (video ⇒ ảnh + âm thanh). */
  readonly derivedOutputs: readonly ProductionOutput[]
  /** Loại kết quả SẼ SẢN XUẤT = chọn + phụ thuộc. */
  readonly produce: readonly ProductionOutput[]
  /** Mọi khung cần sinh (ảnh + video) — mỗi khung một bộ ảnh, một video. */
  readonly ratios: readonly PublishRatio[]
  /** Khung chính (9:16 nếu có) — thời lượng kịch bản theo video của khung này. */
  readonly aspectRatio: PublishRatio
  /** Một video mỗi khung (khi có "video"). */
  readonly videoVariants: readonly VideoVariantPlan[]
  readonly videoFormat: PublishVideoFormat
  readonly targetSeconds: number
  /** Kênh bài đăng (khi có "content"). */
  readonly postChannels: readonly PublishPostChannel[]
  /** Giữ cho tương thích — từ 24/09 tối mọi khung đều sinh nên luôn rỗng. */
  readonly otherRatios: readonly { platform: PublishPlatform; ratio: PublishRatio }[]
}

function pickList<T extends string>(
  input: readonly unknown[] | typeof ALL | null | undefined,
  guard: (v: unknown) => v is T,
  all: readonly T[],
  whenMissing: readonly T[]
): { list: T[]; isAll: boolean } {
  if (input === ALL) return { list: [...all], isAll: true }
  if (input == null) return { list: [...whenMissing], isAll: whenMissing.length === all.length }
  if (Array.isArray(input) && input.includes(ALL)) return { list: [...all], isAll: true }
  const picked = Array.from(new Set((input as readonly unknown[]).filter(guard)))
  // Danh sách rỗng = "Tất cả" (quy tắc của API; giao diện luôn gửi ít nhất một mục hoặc "all").
  if (picked.length === 0) return { list: [...all], isAll: true }
  return { list: picked, isAll: picked.length === all.length }
}

/**
 * Phạm vi sản xuất từ lựa chọn của người dùng (PO 24/09/2026 tối):
 * - chọn gì sản xuất theo đó; mặc định (không truyền) TikTok + Reels 9:16, đủ 4 loại;
 * - "Tất cả" (`"all"`, hoặc danh sách rỗng) = mọi nền tảng / mọi loại kết quả;
 * - nhiều nền tảng khác khung ⇒ sinh ĐỦ các khung (mỗi khung một bộ ảnh + một video);
 * - video phụ thuộc ảnh + âm thanh ⇒ tự thêm.
 */
export function resolvePublishing(
  platformsInput: readonly unknown[] | typeof ALL | null | undefined,
  outputsInput?: readonly unknown[] | typeof ALL | null | undefined
): PublishingPlan {
  const p = pickList(platformsInput, isPublishPlatform, PUBLISH_PLATFORMS, DEFAULT_PLATFORMS)
  const o = pickList(outputsInput, isProductionOutput, PRODUCTION_OUTPUTS, PRODUCTION_OUTPUTS)
  const platforms = p.list
  const outputs = o.list
  const derived: ProductionOutput[] = []
  if (outputs.includes("video")) {
    if (!outputs.includes("image")) derived.push("image")
    if (!outputs.includes("audio")) derived.push("audio")
  }
  const produce = PRODUCTION_OUTPUTS.filter((x) => outputs.includes(x) || derived.includes(x))

  const ratios = PUBLISH_RATIOS.filter((r) => platforms.some((pl) => PLATFORM_SPECS[pl].ratio === r))
  const aspectRatio: PublishRatio = ratios.includes(DEFAULT_RATIO) ? DEFAULT_RATIO : ratios[0]!
  const videoVariants: VideoVariantPlan[] = produce.includes("video")
    ? ratios.map((ratio) => {
        const specs = platforms.filter((pl) => PLATFORM_SPECS[pl].ratio === ratio).map((pl) => PLATFORM_SPECS[pl])
        const shortest = specs.reduce((a, b) => (b.targetSeconds < a.targetSeconds ? b : a))
        return { ratio, videoFormat: shortest.videoFormat, targetSeconds: shortest.targetSeconds, platforms: specs.map((x) => x.platform) }
      })
    : []
  const primarySpecs = platforms.filter((pl) => PLATFORM_SPECS[pl].ratio === aspectRatio).map((pl) => PLATFORM_SPECS[pl])
  const primary = primarySpecs.reduce((a, b) => (b.targetSeconds < a.targetSeconds ? b : a))
  const postChannels = produce.includes("content")
    ? Array.from(new Set(platforms.map((pl) => PLATFORM_SPECS[pl].postChannel).filter((c): c is PublishPostChannel => c !== null)))
    : []
  return {
    platforms,
    allPlatforms: p.isAll,
    outputs,
    allOutputs: o.isAll,
    derivedOutputs: derived,
    produce,
    ratios,
    aspectRatio,
    videoVariants,
    videoFormat: primary.videoFormat,
    targetSeconds: primary.targetSeconds,
    postChannels,
    otherRatios: [],
  }
}

/** Khu vực sản xuất ↔ loại kết quả (B viết content, C audio, D ảnh, E video). */
export const AREA_OUTPUT: Readonly<Record<"area-b" | "area-c" | "area-d" | "area-e", ProductionOutput>> = {
  "area-b": "content",
  "area-c": "audio",
  "area-d": "image",
  "area-e": "video",
}

/**
 * Khu vực có nằm trong phạm vi sản xuất không:
 * `in` = người dùng chọn; `derived` = tự thêm vì video cần; `out` = ngoài phạm vi.
 * Khu vực A/F (không sản xuất một loại riêng) luôn `in`.
 */
export function areaScopeStatus(pub: PublishingPlan, area: string): "in" | "derived" | "out" {
  const output = (AREA_OUTPUT as Record<string, ProductionOutput | undefined>)[area]
  if (!output) return "in"
  if (pub.outputs.includes(output)) return "in"
  if (pub.derivedOutputs.includes(output)) return "derived"
  return "out"
}
