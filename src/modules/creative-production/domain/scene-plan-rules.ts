/**
 * Kịch bản bối cảnh hình ảnh theo chủ đề (Narrative Arc Chặng 04–05 → Khu vực D).
 *
 * Trước 24/09/2026 Khu vực D dùng một khuôn 4 cảnh viết cứng trong giao diện
 * (studio trắng → một bối cảnh chọn theo `angleCategory` → bàn gỗ → PNG), nên
 * chủ đề "bó hoa sinh nhật tone vàng" vẫn ra "Sảnh khách sạn & tiệc mừng".
 * Quyết định của PO (24/09): số cảnh theo kịch bản của chủ đề (CREATIVE 5,
 * AUTHENTIC 3) và kịch bản do AI viết qua job (`creative.scene_plan`).
 *
 * Tệp này là phần THUẦN: hợp đồng dữ liệu, lời nhắc, chuẩn hoá đầu ra của mô
 * hình và kịch bản cơ bản (không gọi AI) để người dùng tự chọn khi AI lỗi.
 * Không import Prisma, không gọi mạng.
 */

import {
  MAX_SCENE_PROMPT_LENGTH,
  type VariantPresetId,
} from "@/modules/media/domain/variant-rules"
import { checkFlowerContent } from "@/core/ai/domain/flower-content-guard"
import { estimateSpeechSeconds } from "@/modules/audio-studio/domain/audio-task-rules"
import { VOICE_CATALOG, suggestVoiceForMode } from "@/modules/audio-studio/domain/voice-catalog"
import { suggestMoodForTopicAngle } from "@/modules/audio-studio/domain/music-catalog"
import { CHANNEL_TEXT_LIMITS, INSTAGRAM_MAX_HASHTAGS } from "./campaign-package-rules"
import {
  PLATFORM_SPECS,
  resolvePublishing,
  type ProductionOutput,
  type PublishPlatform,
  type PublishPostChannel,
  type VideoVariantPlan,
  type PublishRatio,
  type PublishVideoFormat,
} from "./publishing-rules"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

// ============================================================
// HỢP ĐỒNG
// ============================================================

export const SCENE_PLAN_FEATURE = "creative.scene_plan" as const
/**
 * v2 (24/09/2026, quyết định PO): kịch bản bối cảnh thành KỊCH BẢN SẢN XUẤT
 * TỔNG — thêm nền tảng đăng + tỉ lệ, khuôn video + thời lượng từng cảnh, âm
 * thanh (giọng, nhạc, nhịp), chuyển cảnh, bài đăng từng kênh, `revision`. Bản
 * v1 đã lưu được nâng cấp mềm khi đọc (`upgradeScenePlan`).
 */
export const SCENE_PLAN_VERSION = 2 as const

export type ScenePlanMode = "CREATIVE" | "AUTHENTIC"
export type ScenePlanBeat = "SETUP" | "RISING" | "CLIMAX" | "RESOLUTION" | "CTA"
export type ScenePlanMotion = "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "pan_up" | "static"

/** Nhịp theo mode — cùng thứ tự với `planNarrativeArc` (Khu vực B). */
export const SCENE_BEATS_BY_MODE: Readonly<Record<ScenePlanMode, readonly ScenePlanBeat[]>> = {
  CREATIVE: ["SETUP", "RISING", "CLIMAX", "RESOLUTION", "CTA"],
  AUTHENTIC: ["SETUP", "CLIMAX", "CTA"],
}

/** Số cảnh tối đa của mọi mode — giới hạn `scene_index` ở API biến thể. */
export const MAX_SCENE_PLAN_SCENES = 5

/**
 * Phông Studio cục bộ mà worker dựng được, kèm mô tả để mô hình chọn phông
 * gần nhất cho từng cảnh. `transparent` không nằm đây: mỗi job biến thể đã
 * luôn ghi kèm một bản PNG tách nền.
 */
export const LOCAL_BACKDROPS: Readonly<Record<Exclude<VariantPresetId, "transparent">, string>> = {
  studio_white: "phông trắng sạch, đổ bóng mềm (catalog)",
  wedding: "nền bokeh ấm, lãng mạn (tiệc, hẹn hò, cưới)",
  living_room: "không gian nhà ấm cúng, ánh sáng cửa sổ",
  wood_minimal: "mặt gỗ ấm tối giản, ánh ban mai",
  luxury_hotel: "tông xám ấm sang trọng (sảnh, sự kiện, văn phòng)",
}
export type LocalBackdrop = keyof typeof LOCAL_BACKDROPS
const LOCAL_BACKDROP_IDS = Object.keys(LOCAL_BACKDROPS) as LocalBackdrop[]

const MOTIONS: readonly ScenePlanMotion[] = ["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "static"]

export type ScenePlanTransition = "fade" | "slide_left" | "slide_right" | "zoom_in" | "zoom_out" | "dissolve"
export type ScenePlanShot = "close" | "medium" | "wide"
export type ScenePlanMusicCue = "soft" | "build" | "peak" | "resolve"
export type ScenePlanCaptionStyle = "MODERN_BADGE" | "MINIMAL_ELEGANT" | "HIGHLIGHT_BOX" | "BOTTOM_BANNER" | "NONE"
export type ScenePlanMusicMood = "romantic" | "upbeat" | "chill" | "warm" | "luxury" | "none"
export type ScenePlanPacing = "slow" | "medium" | "fast"

export const TRANSITIONS: readonly ScenePlanTransition[] = ["fade", "slide_left", "slide_right", "zoom_in", "zoom_out", "dissolve"]
const SHOTS: readonly ScenePlanShot[] = ["close", "medium", "wide"]
const MUSIC_CUES: readonly ScenePlanMusicCue[] = ["soft", "build", "peak", "resolve"]
const CAPTION_STYLES: readonly ScenePlanCaptionStyle[] = ["MODERN_BADGE", "MINIMAL_ELEGANT", "HIGHLIGHT_BOX", "BOTTOM_BANNER", "NONE"]
const MUSIC_MOODS: readonly ScenePlanMusicMood[] = ["romantic", "upbeat", "chill", "warm", "luxury", "none"]
const PACINGS: readonly ScenePlanPacing[] = ["slow", "medium", "fast"]

/** Giới hạn thời lượng một cảnh (khớp `video_scenes`: 0,5–15s; tối thiểu 1,5s để kịp nhìn). */
export const MIN_SCENE_SECONDS = 1.5
export const MAX_SCENE_SECONDS = 15

/** Trọng số thời lượng theo nhịp: cao trào dài hơn, kêu gọi ngắn gọn. */
const BEAT_WEIGHT: Readonly<Record<ScenePlanBeat, number>> = { SETUP: 1, RISING: 1, CLIMAX: 1.4, RESOLUTION: 1, CTA: 0.8 }
const BEAT_SHOT: Readonly<Record<ScenePlanBeat, ScenePlanShot>> = { SETUP: "medium", RISING: "wide", CLIMAX: "close", RESOLUTION: "wide", CTA: "medium" }
const BEAT_CUE: Readonly<Record<ScenePlanBeat, ScenePlanMusicCue>> = { SETUP: "soft", RISING: "build", CLIMAX: "peak", RESOLUTION: "resolve", CTA: "resolve" }
const BEAT_TRANSITION: Readonly<Record<ScenePlanBeat, ScenePlanTransition>> = { SETUP: "fade", RISING: "slide_left", CLIMAX: "zoom_in", RESOLUTION: "dissolve", CTA: "fade" }

export interface ScenePlanTopic {
  readonly id: string
  readonly title: string
  readonly angleCategory?: string | undefined
  readonly hook?: string | undefined
  readonly cta?: string | undefined
  readonly format?: string | undefined
}

export interface ScenePlanInput {
  readonly mode: ScenePlanMode
  readonly productName: string
  readonly category?: string | undefined
  readonly style?: string | undefined
  readonly colors: readonly string[]
  readonly components: readonly string[]
  readonly occasions: readonly string[]
  readonly targetAudience?: string | undefined
  readonly priceRange?: string | undefined
  readonly topic: ScenePlanTopic
  /** Nền tảng đăng người dùng chọn ở Chặng 04/05 — quyết định khung + khuôn video. `"all"` = tất cả. */
  readonly platforms?: readonly unknown[] | "all" | undefined
  /** Loại kết quả cần sản xuất (content/audio/image/video). `"all"` hoặc bỏ trống = cả 4. */
  readonly outputs?: readonly unknown[] | "all" | undefined
  /** Mã ngành SSOT (FLORAL, FASHION, FNB, v.v.). Mặc định "FLORAL". */
  readonly industryKey?: string | undefined
}

export interface ScenePlanScene {
  readonly sceneIndex: number
  readonly beat: ScenePlanBeat
  /** Tên cảnh ngắn, tiếng Việt. */
  readonly title: string
  /** Không gian/bối cảnh của cảnh, tiếng Việt — hiển thị cho chủ tiệm. */
  readonly setting: string
  readonly lighting: string
  readonly palette: readonly string[]
  /** Mục đích dùng ảnh (kênh/định dạng). */
  readonly purpose: string
  /** Mô tả KHÔNG GIAN hậu cảnh, tiếng Anh, gửi Stability — không hoa, không người, không chữ. */
  readonly backgroundPrompt: string
  /** Phông cục bộ gần nhất — dùng khi chạy Studio cục bộ hoặc khi Stability lỗi. */
  readonly localBackdrop: LocalBackdrop
  readonly voiceScript: string
  /** Phụ đề = LỜI THOẠI (PO 24/09/2026) — luôn bằng `voiceScript`, giữ trường để tương thích. */
  readonly textOverlay: string
  readonly motionEffect: ScenePlanMotion
  /** v2 — thời lượng cảnh (giây), tổng khớp khuôn video, đủ thời gian đọc trọn lời thoại. */
  readonly durationSeconds: number
  /** v2 — chuyển cảnh SANG cảnh này. */
  readonly transition: ScenePlanTransition
  /** v2 — cỡ cảnh gợi ý (cận/trung/toàn). */
  readonly shot: ScenePlanShot
  /** v2 — nhạc nền ở cảnh này. */
  readonly musicCue: ScenePlanMusicCue
}

export interface ScenePlanPost {
  readonly channel: PublishPostChannel
  readonly text: string
  readonly hashtags: readonly string[]
}

export interface ScenePlanPublishing {
  readonly platforms: readonly PublishPlatform[]
  /** PHẠM VI SẢN XUẤT (PO 24/09/2026 tối). */
  readonly allPlatforms: boolean
  readonly outputs: readonly ProductionOutput[]
  readonly allOutputs: boolean
  readonly derivedOutputs: readonly ProductionOutput[]
  /** Loại kết quả sẽ sản xuất = chọn + phụ thuộc. */
  readonly produce: readonly ProductionOutput[]
  /** Mọi khung cần sinh; `aspectRatio` là khung chính. */
  readonly ratios: readonly PublishRatio[]
  /** Một video mỗi khung. */
  readonly videoVariants: readonly VideoVariantPlan[]
  readonly aspectRatio: PublishRatio
  /** Nền tảng khác tỉ lệ chính — cấu hình sẵn, CHƯA sinh (PO 24/09: mặc định 9:16). */
  readonly otherRatios: readonly { platform: PublishPlatform; ratio: PublishRatio }[]
}

export interface ScenePlanVideo {
  readonly format: PublishVideoFormat
  readonly totalDurationSeconds: number
  readonly captionStyle: ScenePlanCaptionStyle
  readonly hasSubtitle: boolean
  readonly hasWatermark: boolean
  /** Cảnh làm ảnh bìa video. */
  readonly coverSceneIndex: number
  /** Chữ màn kết (CTA). */
  readonly endCardText: string
}

export interface ScenePlanAudio {
  /** Mã giọng của `voice-catalog.ts`. */
  readonly voiceId: string
  readonly qualityTier: "standard" | "hd" | "premium"
  readonly musicMood: ScenePlanMusicMood
  readonly pacing: ScenePlanPacing
}

export interface ScenePlanContent {
  /** Bài đăng cho các kênh của nền tảng đã chọn (rỗng = Khu vực B dùng khuôn dự phòng). */
  readonly posts: readonly ScenePlanPost[]
  /** Chú thích khi đăng chính video. */
  readonly videoCaption: { readonly text: string; readonly hashtags: readonly string[] }
}

export interface ScenePlan {
  readonly version: typeof SCENE_PLAN_VERSION
  /** `ai` = mô hình viết qua job; `rule` = kịch bản cơ bản người dùng tự chọn khi AI lỗi. */
  readonly source: "ai" | "rule"
  readonly mode: ScenePlanMode
  readonly topicId: string
  readonly topicTitle: string
  readonly emotionalTone: string
  readonly reasoning: string
  readonly scenes: readonly ScenePlanScene[]
  /** v2 — tăng mỗi lần kịch bản được sửa (PATCH, sửa cảnh ở Chặng 07). Tài sản mang số này. */
  readonly revision: number
  readonly story: { readonly hook: string; readonly cta: string; readonly logline: string }
  readonly publishing: ScenePlanPublishing
  readonly video: ScenePlanVideo
  readonly audio: ScenePlanAudio
  readonly content: ScenePlanContent
}

// ============================================================
// TIỆN ÍCH
// ============================================================

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim().slice(0, max)
}

function textList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => text(v, maxLen)).filter((v) => v.length > 0).slice(0, maxItems)
}

/**
 * Lời nhắc hậu cảnh chỉ được tả không gian. Bỏ ký tự điều khiển và cắt độ dài;
 * worker còn tự nối "no flowers, no people, no text" — đây là lớp chặn thứ nhất.
 */
export function sanitizeBackgroundPrompt(value: unknown): string {
  return text(value, MAX_SCENE_PROMPT_LENGTH * 2)
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\b(bouquets?|flowers?|florals?|roses?|people|person|woman|man|hands?|text|logo|letters?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/^[,.\s]+/, "")
    .trim()
    .slice(0, MAX_SCENE_PROMPT_LENGTH)
}

export function isLocalBackdrop(value: unknown): value is LocalBackdrop {
  return typeof value === "string" && (LOCAL_BACKDROP_IDS as string[]).includes(value)
}

/** Số cảnh đúng của mode. */
export function sceneCountFor(mode: ScenePlanMode): number {
  return SCENE_BEATS_BY_MODE[mode].length
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Số giây tối thiểu để đọc trọn lời thoại của một cảnh (không tua nhanh). */
export function sceneSpeechNeed(voiceScript: string): number {
  return Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, round1(estimateSpeechSeconds(voiceScript) + 0.3)))
}

/**
 * Cân thời lượng từng cảnh (24/09/2026). Đề xuất của AI (hoặc trọng số theo
 * nhịp) được co giãn về `targetSeconds`; cảnh nào ngắn hơn số giây đọc trọn
 * lời thì được nới, phần dư lấy bớt ở cảnh còn thừa. Không đủ chỗ thì tổng
 * vượt mục tiêu (lời thoại quan trọng hơn con số khuôn).
 */
export function balanceSceneDurations(
  scenes: readonly { beat: ScenePlanBeat; voiceScript: string; durationSeconds?: number | undefined }[],
  targetSeconds: number
): number[] {
  if (scenes.length === 0) return []
  const need = scenes.map((sc) => sceneSpeechNeed(sc.voiceScript))
  const aiOk = scenes.every((sc) => typeof sc.durationSeconds === "number" && sc.durationSeconds > 0)
  const raw = scenes.map((sc) => (aiOk ? (sc.durationSeconds as number) : BEAT_WEIGHT[sc.beat]))
  const sumRaw = raw.reduce((a, b) => a + b, 0) || 1
  const d = raw.map((r, i) => Math.min(MAX_SCENE_SECONDS, Math.max(need[i]!, (r * targetSeconds) / sumRaw)))
  const total = d.reduce((a, b) => a + b, 0)
  if (total > targetSeconds) {
    const excess = total - targetSeconds
    const slack = d.map((x, i) => x - need[i]!)
    const sumSlack = slack.reduce((a, b) => a + b, 0)
    for (let i = 0; i < d.length; i++) {
      d[i] = sumSlack >= excess && sumSlack > 0 ? d[i]! - (slack[i]! * excess) / sumSlack : need[i]!
    }
  }
  return d.map((x) => round1(Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, x))))
}

function normHashtags(value: unknown, max: number): string[] {
  return (Array.isArray(value) ? value : [])
    .map((h) => (typeof h === "string" ? h.trim().replace(/\s+/g, "") : ""))
    .filter((h) => h.length > 1)
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .slice(0, max)
}

/** Phần `publishing` lưu trong kịch bản từ phương án đăng. */
export function publishingOf(pub: ReturnType<typeof resolvePublishing>): ScenePlanPublishing {
  return {
    platforms: pub.platforms,
    allPlatforms: pub.allPlatforms,
    outputs: pub.outputs,
    allOutputs: pub.allOutputs,
    derivedOutputs: pub.derivedOutputs,
    produce: pub.produce,
    ratios: pub.ratios,
    videoVariants: pub.videoVariants,
    aspectRatio: pub.aspectRatio,
    otherRatios: pub.otherRatios,
  }
}

/** Bài đăng hợp lệ cho một kênh: đủ dài, trong giới hạn kênh, không dính từ cấm cứng. */
export function normalizeScenePlanPost(raw: unknown, channel: PublishPostChannel): ScenePlanPost | null {
  const o = raw as { text?: unknown; hashtags?: unknown } | null
  const body = typeof o?.text === "string" ? o.text.trim() : ""
  if (body.length < 10) return null
  if (!checkFlowerContent(body).isValid) return null
  return {
    channel,
    text: body.slice(0, CHANNEL_TEXT_LIMITS[channel]),
    hashtags: normHashtags(o?.hashtags, channel === "instagram" ? INSTAGRAM_MAX_HASHTAGS : 15),
  }
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * Hoàn thiện phần v2 của một kịch bản (dùng chung cho AI, luật và bản v1 cũ).
 * `raw` là phần mô hình trả (có thể thiếu) — thiếu trường nào lấy mặc định
 * theo nhịp/mode/chủ đề, không bịa nội dung (bài đăng thiếu thì để rỗng).
 */
export function completeScenePlanV2(
  base: {
    mode: ScenePlanMode
    topic: ScenePlanTopic
    scenes: readonly Omit<ScenePlanScene, "durationSeconds" | "transition" | "shot" | "musicCue">[]
    platforms?: readonly unknown[] | "all" | undefined
    outputs?: readonly unknown[] | "all" | undefined
    revision?: number | undefined
  },
  raw: {
    scenes?: readonly Record<string, unknown>[] | undefined
    audio?: Record<string, unknown> | undefined
    video?: Record<string, unknown> | undefined
    story?: Record<string, unknown> | undefined
    posts?: unknown
    videoCaption?: Record<string, unknown> | undefined
  } = {}
): Pick<ScenePlan, "scenes" | "revision" | "story" | "publishing" | "video" | "audio" | "content"> {
  const pub = resolvePublishing(base.platforms, base.outputs)
  const rawScenes = raw.scenes ?? []
  const durations = balanceSceneDurations(
    base.scenes.map((sc, i) => ({
      beat: sc.beat,
      voiceScript: sc.voiceScript,
      durationSeconds: typeof rawScenes[i]?.duration_seconds === "number" ? (rawScenes[i]!.duration_seconds as number) : undefined,
    })),
    pub.targetSeconds
  )
  const scenes: ScenePlanScene[] = base.scenes.map((sc, i) => ({
    ...sc,
    textOverlay: sc.voiceScript,
    durationSeconds: durations[i]!,
    transition: pick(rawScenes[i]?.transition, TRANSITIONS, BEAT_TRANSITION[sc.beat]),
    shot: pick(rawScenes[i]?.shot, SHOTS, BEAT_SHOT[sc.beat]),
    musicCue: pick(rawScenes[i]?.music_cue, MUSIC_CUES, BEAT_CUE[sc.beat]),
  }))
  const cta = text(raw.story?.cta, 200) || base.topic.cta || "Nhắn tin cho tiệm để đặt hoa"
  const voiceIds = VOICE_CATALOG.map((v) => v.voiceId)
  const defaultVoice = suggestVoiceForMode(base.mode).voiceId
  const defaultMood = base.topic.angleCategory ? suggestMoodForTopicAngle(base.topic.angleCategory) : "warm"

  const postsRaw = Array.isArray(raw.posts) ? (raw.posts as Record<string, unknown>[]) : []
  const posts: ScenePlanPost[] = []
  for (const ch of pub.postChannels) {
    const found = postsRaw.find((p) => p && p.channel === ch)
    const post = found ? normalizeScenePlanPost(found, ch) : null
    if (post) posts.push(post)
  }
  const vcText = text(raw.videoCaption?.text, 2200)

  return {
    scenes,
    revision: Math.max(1, Math.floor(base.revision ?? 1)),
    story: {
      hook: text(raw.story?.hook, 300) || base.topic.hook || "",
      cta,
      logline: text(raw.story?.logline, 300),
    },
    publishing: publishingOf(pub),
    video: {
      format: pub.videoFormat,
      totalDurationSeconds: round1(durations.reduce((a, b) => a + b, 0)),
      captionStyle: pick(raw.video?.caption_style, CAPTION_STYLES, "MODERN_BADGE"),
      hasSubtitle: raw.video?.has_subtitle === false ? false : true,
      hasWatermark: raw.video?.has_watermark === false ? false : true,
      coverSceneIndex: Math.min(
        scenes.length,
        Math.max(1, typeof raw.video?.cover_scene_index === "number" ? Math.round(raw.video.cover_scene_index as number) : 1)
      ),
      endCardText: text(raw.video?.end_card_text, 60) || text(cta, 60),
    },
    audio: {
      voiceId: pick(raw.audio?.voice_id, voiceIds, defaultVoice),
      qualityTier: pick(raw.audio?.quality_tier, ["standard", "hd", "premium"] as const, "hd"),
      musicMood: pick(raw.audio?.music_mood, MUSIC_MOODS, defaultMood),
      pacing: pick(raw.audio?.pacing, PACINGS, base.mode === "AUTHENTIC" ? "slow" : "medium"),
    },
    content: {
      posts,
      videoCaption: { text: vcText, hashtags: normHashtags(raw.videoCaption?.hashtags, 15) },
    },
  }
}

/**
 * Khoá idempotency cho kịch bản của MỘT chủ đề trên MỘT ảnh — mở lại Khu vực D
 * hay Khu vực C tra lại đúng kịch bản cũ, không trừ credit lần hai.
 */
export function scenePlanKey(input: { assetId: string; topicId: string; mode: ScenePlanMode }): string {
  return `scene-plan:${input.assetId}:${input.topicId}:${input.mode}`
}

// ============================================================
// LỜI NHẮC
// ============================================================

function dong(nhan: string, giaTri: string | readonly string[] | undefined | null): string {
  const v = Array.isArray(giaTri) ? giaTri.join(", ") : (giaTri as string | undefined | null)
  return `- ${nhan}: ${v && v.length > 0 ? v : "chưa xác định"}`
}

// Bài đăng theo kênh KHÔNG còn nhờ mô hình viết ở đây nữa (P27, 25/09/2026):
// việc viết bài đã chuyển sang Content Engine (chuỗi Strategist→Writer→
// Critic→Rewriter, `generateContent()`), gọi tiếp sau khi kịch bản này chạy
// xong (`generate-scene-plan.ts`). Trường "posts" giữ lại trong JSON schema
// đầu ra và trong kiểu `ScenePlan.content.posts` để không phá bản ghi cũ,
// nhưng KHÔNG còn hỏi mô hình sinh nó nữa — `postsRaw` ở `completeScenePlanV2()`
// do đó luôn rỗng, `content.posts` = [] cho mọi kịch bản mới.
export function buildScenePlanPrompt(input: ScenePlanInput): string {
  const beats = SCENE_BEATS_BY_MODE[input.mode]
  const pub = resolvePublishing(input.platforms, input.outputs)
  const phong = LOCAL_BACKDROP_IDS.map((id) => `  - ${id}: ${LOCAL_BACKDROPS[id]}`).join("\n")
  const industryKey = input.industryKey || "FLORAL"
  const plugin = getIndustryPlugin(industryKey)
  const industryName = plugin.identity.name
  const productTerm = plugin.terminology.sampleProduct
  const backgroundSuggestions = plugin.aiConfig.studioBackgroundStyles.length > 0
    ? `\nGỢI Ý BỐI CẢNH ĐẶC TRƯNG NGÀNH (${industryName}):\n${plugin.aiConfig.studioBackgroundStyles.map((s) => `  - ${s}`).join("\n")}\n`
    : ""

  const modeRule =
    input.mode === "AUTHENTIC"
      ? `AUTHENTIC: giữ tinh thần ảnh thật, bối cảnh giản dị, gần với tiệm ${industryName} thật; không dựng không gian xa hoa.`
      : "CREATIVE: mỗi cảnh một không gian khác nhau nhưng cùng một câu chuyện, bám sát dịp và tông màu của chủ đề."

  return `Bạn là đạo diễn hình ảnh cho cửa hàng ${industryName}. Viết KỊCH BẢN BỐI CẢNH cho bộ ảnh/video quảng bá MỘT ${productTerm} theo đúng chủ đề đã chọn.

CHỦ ĐỀ (Chặng 04–05)
${dong("Tiêu đề", input.topic.title)}
${dong("Góc tiếp cận", input.topic.angleCategory)}
${dong("Hook", input.topic.hook)}
${dong("CTA", input.topic.cta)}
${dong("Định dạng", input.topic.format)}

SẢN PHẨM
${dong("Tên", input.productName)}
${dong("Hình dáng", input.category)}
${dong("Phong cách", input.style)}
${dong("Màu sắc", input.colors)}
${dong("Thành phần", input.components)}
${dong("Dịp phù hợp", input.occasions)}
${dong("Người mua", input.targetAudience)}
${dong("Khoảng giá", input.priceRange)}
${backgroundSuggestions}
YÊU CẦU
- Đúng ${beats.length} cảnh, theo thứ tự nhịp: ${beats.join(" → ")}.
- ${modeRule}
- Bối cảnh phải khớp DỊP và TÔNG MÀU nêu trong tiêu đề chủ đề (ví dụ chủ đề sinh nhật tone vàng thì không gian sinh nhật, bảng màu hài hoà với vàng). Không dùng bối cảnh không liên quan đến dịp.
- ${productTerm} thật sẽ được dán nguyên khối vào ảnh: KHÔNG mô tả sản phẩm, người, bàn tay, chữ hay logo trong bối cảnh; chỉ mô tả không gian, bề mặt đặt sản phẩm, ánh sáng, màu.
- setting, title, lighting, purpose, voice_script: tiếng Việt có dấu. voice_script 1–2 câu ngắn, tự nhiên — CHÍNH câu này hiện làm phụ đề trên video (không có phụ đề riêng); text_overlay để trống.
- background_prompt: tiếng Anh, 1–3 câu, chỉ tả không gian trống (surface, room, light, colour palette, depth of field), dạng ảnh chụp sản phẩm chân thực.
- local_backdrop: chọn MỘT phông cục bộ gần nhất với cảnh:
${phong}
- motion_effect: một trong ${MOTIONS.join(" | ")}.
- Không bịa giá, khuyến mãi hay cam kết dịch vụ.

KẾ HOẠCH SẢN XUẤT (ảnh, âm thanh, video, bài đăng dùng CHUNG kịch bản này)
- Nền tảng đăng: ${pub.platforms.map((p) => PLATFORM_SPECS[p].label).join(", ")} → khung ${pub.aspectRatio}, video khoảng ${pub.targetSeconds} giây.
- duration_seconds từng cảnh: tổng ≈ ${pub.targetSeconds}s; cảnh cao trào dài hơn; mỗi cảnh đủ để đọc trọn voice_script (~14 ký tự/giây).
- transition: ${TRANSITIONS.join(" | ")}; shot: ${SHOTS.join(" | ")}; music_cue: ${MUSIC_CUES.join(" | ")}.
- audio.voice_id — chọn MỘT giọng hợp chủ đề: ${VOICE_CATALOG.map((v) => `${v.voiceId} (${v.displayName})`).join("; ")}. audio.music_mood: ${MUSIC_MOODS.join(" | ")}. audio.pacing: ${PACINGS.join(" | ")}.
- video.caption_style: ${CAPTION_STYLES.join(" | ")}; video.end_card_text ≤ 60 ký tự.
- video_caption: chú thích khi đăng video (ngắn, có CTA) + hashtags.
- story: hook, cta, logline (một câu tóm câu chuyện).

Trả về JSON: { "emotional_tone": string, "reasoning": string, "story": { "hook", "cta", "logline" }, "scenes": [ { "beat", "title", "setting", "lighting", "palette": string[], "purpose", "background_prompt", "local_backdrop", "voice_script", "text_overlay", "motion_effect", "duration_seconds", "transition", "shot", "music_cue" } ], "audio": { "voice_id", "music_mood", "pacing" }, "video": { "caption_style", "end_card_text", "cover_scene_index" }, "video_caption": { "text", "hashtags": string[] } }. Không thêm lời dẫn.`
}

/** JSON schema gửi kèm lời gọi mô hình. */
export function scenePlanJsonSchema(mode: ScenePlanMode): Record<string, unknown> {
  const n = sceneCountFor(mode)
  return {
    type: "object",
    properties: {
      emotional_tone: { type: "string" },
      reasoning: { type: "string" },
      scenes: {
        type: "array",
        minItems: n,
        maxItems: n,
        items: {
          type: "object",
          properties: {
            beat: { type: "string", enum: [...SCENE_BEATS_BY_MODE[mode]] },
            title: { type: "string" },
            setting: { type: "string" },
            lighting: { type: "string" },
            palette: { type: "array", items: { type: "string" } },
            purpose: { type: "string" },
            background_prompt: { type: "string" },
            local_backdrop: { type: "string", enum: LOCAL_BACKDROP_IDS },
            voice_script: { type: "string" },
            text_overlay: { type: "string" },
            motion_effect: { type: "string", enum: [...MOTIONS] },
            duration_seconds: { type: "number" },
            transition: { type: "string", enum: [...TRANSITIONS] },
            shot: { type: "string", enum: [...SHOTS] },
            music_cue: { type: "string", enum: [...MUSIC_CUES] },
          },
          required: ["beat", "title", "setting", "background_prompt", "local_backdrop", "voice_script", "duration_seconds"],
        },
      },
      story: {
        type: "object",
        properties: { hook: { type: "string" }, cta: { type: "string" }, logline: { type: "string" } },
      },
      audio: {
        type: "object",
        properties: {
          voice_id: { type: "string", enum: VOICE_CATALOG.map((v) => v.voiceId) },
          music_mood: { type: "string", enum: [...MUSIC_MOODS] },
          pacing: { type: "string", enum: [...PACINGS] },
        },
      },
      video: {
        type: "object",
        properties: {
          caption_style: { type: "string", enum: [...CAPTION_STYLES] },
          end_card_text: { type: "string" },
          cover_scene_index: { type: "number" },
        },
      },
      // "posts" đã bỏ khỏi JSON schema gửi mô hình (P27, 25/09/2026) — Content
      // Engine viết bài, không còn nhờ mô hình kịch bản viết nữa (xem chú
      // thích ở buildScenePlanPrompt()).
      video_caption: {
        type: "object",
        properties: { text: { type: "string" }, hashtags: { type: "array", items: { type: "string" } } },
      },
    },
    required: ["scenes"],
  }
}

// ============================================================
// CHUẨN HOÁ ĐẦU RA MÔ HÌNH
// ============================================================

export type NormalizeResult = { ok: true; plan: ScenePlan } | { ok: false; reason: string }

/**
 * Nhận JSON của mô hình, trả kịch bản đã chuẩn hoá hoặc lý do loại. Không tự
 * "vá" một cảnh thiếu bối cảnh bằng chữ mặc định — thiếu thì loại cả lượt để
 * cổng AI ghi thất bại và hoàn credit.
 */
export function normalizeAiScenePlan(raw: unknown, input: ScenePlanInput): NormalizeResult {
  const o = raw as {
    emotional_tone?: unknown
    reasoning?: unknown
    scenes?: unknown
    story?: unknown
    audio?: unknown
    video?: unknown
    posts?: unknown
    video_caption?: unknown
  } | null
  if (!o || typeof o !== "object") return { ok: false, reason: "Đầu ra không phải object" }
  if (!Array.isArray(o.scenes)) return { ok: false, reason: "Thiếu danh sách scenes" }

  const beats = SCENE_BEATS_BY_MODE[input.mode]
  if (o.scenes.length !== beats.length) {
    return { ok: false, reason: `Cần đúng ${beats.length} cảnh, mô hình trả ${o.scenes.length}` }
  }

  const scenes: Omit<ScenePlanScene, "durationSeconds" | "transition" | "shot" | "musicCue">[] = []
  for (let i = 0; i < beats.length; i++) {
    const s = o.scenes[i] as Record<string, unknown> | null
    if (!s || typeof s !== "object") return { ok: false, reason: `Cảnh ${i + 1} không hợp lệ` }
    const setting = text(s.setting, 300)
    const backgroundPrompt = sanitizeBackgroundPrompt(s.background_prompt)
    const title = text(s.title, 80)
    if (!setting || !title) return { ok: false, reason: `Cảnh ${i + 1} thiếu tên hoặc bối cảnh` }
    if (backgroundPrompt.length < 15) {
      return { ok: false, reason: `Cảnh ${i + 1} thiếu mô tả hậu cảnh dùng được` }
    }
    scenes.push({
      sceneIndex: i + 1,
      // Thứ tự nhịp do mode quyết định, không do mô hình.
      beat: beats[i]!,
      title,
      setting,
      lighting: text(s.lighting, 120),
      palette: textList(s.palette, 5, 30),
      purpose: text(s.purpose, 120),
      backgroundPrompt,
      localBackdrop: isLocalBackdrop(s.local_backdrop) ? s.local_backdrop : inferLocalBackdrop(setting),
      voiceScript: text(s.voice_script, 300),
      textOverlay: text(s.text_overlay, 60),
      motionEffect: MOTIONS.includes(s.motion_effect as ScenePlanMotion)
        ? (s.motion_effect as ScenePlanMotion)
        : "static",
    })
  }

  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined)
  const v2 = completeScenePlanV2(
    { mode: input.mode, topic: input.topic, scenes, platforms: input.platforms, outputs: input.outputs },
    {
      scenes: o.scenes as Record<string, unknown>[],
      story: obj(o.story),
      audio: obj(o.audio),
      video: obj(o.video),
      posts: o.posts,
      videoCaption: obj(o.video_caption),
    }
  )
  return {
    ok: true,
    plan: {
      version: SCENE_PLAN_VERSION,
      source: "ai",
      mode: input.mode,
      topicId: input.topic.id,
      topicTitle: input.topic.title,
      emotionalTone: text(o.emotional_tone, 120),
      reasoning: text(o.reasoning, 600),
      ...v2,
    },
  }
}

/** Đọc lại kịch bản đã lưu trong `generation_jobs.output` — trả null nếu hình dạng lạ. */
export function parseStoredScenePlan(value: unknown): ScenePlan | null {
  const p = value as (Omit<Partial<ScenePlan>, "version"> & { version?: number }) | null
  if (!p || typeof p !== "object" || (p.version !== 1 && p.version !== SCENE_PLAN_VERSION)) return null
  if (!Array.isArray(p.scenes) || p.scenes.length === 0 || p.scenes.length > MAX_SCENE_PLAN_SCENES) {
    return null
  }
  if (p.mode !== "CREATIVE" && p.mode !== "AUTHENTIC") return null
  let plan = p.version === 1 ? upgradeScenePlan(p as unknown as ScenePlanV1) : (p as ScenePlan)
  // Kịch bản lưu trước "phạm vi sản xuất" (24/09 tối): suy phạm vi từ nền tảng đã lưu, đủ 4 loại kết quả.
  if (!Array.isArray((plan.publishing as Partial<ScenePlanPublishing> | undefined)?.ratios)) {
    plan = { ...plan, publishing: publishingOf(resolvePublishing(plan.publishing?.platforms ?? null, "all")) }
  }
  return withSubtitleEqualsVoice(plan)
}

/** Phụ đề = lời thoại cho mọi cảnh (áp cả cho kịch bản lưu trước 24/09 tối). */
export function withSubtitleEqualsVoice(plan: ScenePlan): ScenePlan {
  return plan.scenes.every((s) => s.textOverlay === s.voiceScript)
    ? plan
    : { ...plan, scenes: plan.scenes.map((s) => ({ ...s, textOverlay: s.voiceScript })) }
}

/** Hình dạng bản v1 (trước 24/09/2026 tối). */
export type ScenePlanV1 = Omit<ScenePlan, "version" | "scenes" | "revision" | "story" | "publishing" | "video" | "audio" | "content"> & {
  version: 1
  scenes: Omit<ScenePlanScene, "durationSeconds" | "transition" | "shot" | "musicCue">[]
}

/** Nâng bản v1 đã lưu lên v2 khi đọc: nền tảng mặc định (9:16), thời lượng cân theo lời thoại, âm thanh theo mode/chủ đề, chưa có bài đăng. */
export function upgradeScenePlan(p: ScenePlanV1): ScenePlan {
  const topic: ScenePlanTopic = { id: p.topicId, title: p.topicTitle }
  return {
    version: SCENE_PLAN_VERSION,
    source: p.source,
    mode: p.mode,
    topicId: p.topicId,
    topicTitle: p.topicTitle,
    emotionalTone: p.emotionalTone,
    reasoning: p.reasoning,
    ...completeScenePlanV2({ mode: p.mode, topic, scenes: p.scenes }),
  }
}

// ============================================================
// KỊCH BẢN CƠ BẢN (không AI — người dùng tự chọn khi AI lỗi)
// ============================================================

interface OccasionProfile {
  readonly keys: readonly string[]
  readonly name: string
  readonly spaces: readonly { setting: string; prompt: string; backdrop: LocalBackdrop }[]
}

const OCCASIONS: readonly OccasionProfile[] = [
  {
    keys: ["sinh nhật", "sinh nhat", "birthday"],
    name: "Sinh nhật",
    spaces: [
      { setting: "Bàn tiệc sinh nhật tại gia, bánh kem và nến mờ phía sau", prompt: "a cosy home birthday table, softly blurred cake and candles in the background", backdrop: "wedding" },
      { setting: "Góc phòng khách trang trí bóng bay nhẹ nhàng", prompt: "a bright living room corner with a few soft balloons out of focus", backdrop: "living_room" },
    ],
  },
  {
    keys: ["cưới", "cuoi", "wedding", "hẹn hò", "valentine", "tình yêu", "kỷ niệm"],
    name: "Lãng mạn",
    spaces: [
      { setting: "Bàn tiệc lãng mạn, nến ấm và khăn trải bàn lụa", prompt: "a romantic dinner table with warm candlelight and a silk tablecloth", backdrop: "wedding" },
      { setting: "Cửa sổ hoàng hôn trong căn hộ ấm cúng", prompt: "a cosy apartment window at golden hour", backdrop: "living_room" },
    ],
  },
  {
    keys: ["khai trương", "khai truong", "chúc mừng", "sự kiện", "hội nghị", "văn phòng"],
    name: "Khai trương & sự kiện",
    spaces: [
      { setting: "Sảnh sự kiện sang trọng, ánh đèn vàng ấm", prompt: "an elegant event lobby with warm ambient lighting", backdrop: "luxury_hotel" },
      { setting: "Quầy lễ tân văn phòng hiện đại", prompt: "a modern office reception counter with clean lines", backdrop: "luxury_hotel" },
    ],
  },
  {
    keys: ["tốt nghiệp", "tot nghiep", "graduation", "20/11", "thầy cô"],
    name: "Tốt nghiệp",
    spaces: [
      { setting: "Sân trường nắng nhẹ, hậu cảnh mờ", prompt: "a sunny campus courtyard, softly blurred", backdrop: "living_room" },
    ],
  },
  {
    keys: ["chia buồn", "tang", "viếng"],
    name: "Chia buồn",
    spaces: [
      { setting: "Không gian trang nghiêm, tông trầm và ánh sáng dịu", prompt: "a calm solemn room with muted tones and soft diffused light", backdrop: "studio_white" },
    ],
  },
]

const DEFAULT_OCCASION: OccasionProfile = {
  keys: [],
  name: "Tặng hoa",
  spaces: [
    { setting: "Góc phòng khách ấm cúng, ánh sáng cửa sổ", prompt: "a cosy living room corner with natural window light", backdrop: "living_room" },
  ],
}

function detectOccasion(input: ScenePlanInput): OccasionProfile {
  const haystack = [input.topic.title, input.topic.hook, ...input.occasions]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return OCCASIONS.find((o) => o.keys.some((k) => haystack.includes(k))) ?? DEFAULT_OCCASION
}

const COLOR_WORDS: Readonly<Record<string, string>> = {
  vàng: "warm yellow and cream",
  đỏ: "deep red and ivory",
  hồng: "blush pink and white",
  trắng: "white and soft beige",
  tím: "lavender and soft grey",
  xanh: "sage green and white",
  cam: "peach and warm beige",
  pastel: "soft pastel",
}

function detectPalette(input: ScenePlanInput): { vi: string[]; en: string } {
  const haystack = [input.topic.title, ...input.colors].join(" ").toLowerCase()
  const found = Object.keys(COLOR_WORDS).filter((c) => haystack.includes(c))
  const vi = found.length > 0 ? found.slice(0, 3) : input.colors.slice(0, 3)
  const en = found.length > 0 ? found.map((c) => COLOR_WORDS[c]).join(", ") : "neutral warm tones"
  return { vi, en }
}

/** Đoán phông cục bộ theo chữ trong bối cảnh — dùng khi mô hình trả phông lạ. */
export function inferLocalBackdrop(setting: string): LocalBackdrop {
  const s = setting.toLowerCase()
  if (/trắng|studio|catalog/.test(s)) return "studio_white"
  if (/gỗ|bàn làm việc|ban mai|tối giản/.test(s)) return "wood_minimal"
  if (/sảnh|khách sạn|sự kiện|văn phòng|sang trọng/.test(s)) return "luxury_hotel"
  if (/tiệc|nến|lãng mạn|cưới|hẹn hò|bokeh/.test(s)) return "wedding"
  return "living_room"
}

/**
 * Kịch bản cơ bản theo dịp + tông màu phát hiện trong chủ đề. Không gọi mô
 * hình, không trừ credit — ghi `source: "rule"` để giao diện nói rõ.
 */
export function buildRuleScenePlan(input: ScenePlanInput): ScenePlan {
  const occasion = detectOccasion(input)
  const palette = detectPalette(input)
  const name = input.productName || "sản phẩm"
  const main = occasion.spaces[0]!
  const alt = occasion.spaces[1] ?? main
  const cta = input.topic.cta || "Nhắn tin cho tiệm để đặt hoa"

  const byBeat: Record<ScenePlanBeat, Omit<ScenePlanScene, "sceneIndex" | "beat" | "durationSeconds" | "transition" | "shot" | "musicCue">> = {
    SETUP: {
      title: "Giới thiệu sản phẩm",
      setting: "Phông studio sáng, đổ bóng mềm, tông màu hoà với sản phẩm",
      lighting: "Ánh sáng tản đều",
      palette: palette.vi,
      purpose: "Ảnh catalog, bài giới thiệu",
      backgroundPrompt: sanitizeBackgroundPrompt(`a clean seamless studio backdrop in ${palette.en}, soft shadow, product photography`),
      localBackdrop: "studio_white",
      voiceScript: input.topic.hook || `Giới thiệu ${name}.`,
      textOverlay: text(input.topic.title, 60),
      motionEffect: "zoom_in",
    },
    RISING: {
      title: `${occasion.name} — không gian`,
      setting: main.setting,
      lighting: "Ánh sáng ấm tự nhiên",
      palette: palette.vi,
      purpose: "Bài Facebook/Instagram lifestyle",
      backgroundPrompt: sanitizeBackgroundPrompt(`${main.prompt}, ${palette.en} palette, shallow depth of field`),
      localBackdrop: main.backdrop,
      voiceScript: `${name} cho dịp ${occasion.name.toLowerCase()}.`,
      textOverlay: text(occasion.name, 60),
      motionEffect: "pan_right",
    },
    CLIMAX: {
      title: "Cận cảnh điểm nhấn",
      setting: "Mặt bàn gỗ sáng, cận cảnh để thấy rõ phụ liệu và thiệp",
      lighting: "Ánh ban mai nghiêng",
      palette: palette.vi,
      purpose: "Ảnh chi tiết, chốt đơn Zalo",
      backgroundPrompt: sanitizeBackgroundPrompt(`a light wooden tabletop close-up with morning side light, ${palette.en} accents`),
      localBackdrop: "wood_minimal",
      voiceScript: `Từng chi tiết của ${name} đều được chăm chút.`,
      textOverlay: "",
      motionEffect: "zoom_out",
    },
    RESOLUTION: {
      title: "Khoảnh khắc trao tặng",
      setting: alt.setting,
      lighting: "Ánh sáng dịu",
      palette: palette.vi,
      purpose: "Story, Reels",
      backgroundPrompt: sanitizeBackgroundPrompt(`${alt.prompt}, ${palette.en} palette`),
      localBackdrop: alt.backdrop,
      voiceScript: "Một món quà trọn vẹn cảm xúc.",
      textOverlay: "",
      motionEffect: "pan_left",
    },
    CTA: {
      title: "Kêu gọi đặt hoa",
      setting: "Phông tối giản cùng tông màu, chừa khoảng trống cho chữ CTA",
      lighting: "Ánh sáng sạch",
      palette: palette.vi,
      purpose: "Banner, ảnh kết video",
      backgroundPrompt: sanitizeBackgroundPrompt(`a minimal backdrop in ${palette.en} with generous empty space, soft light`),
      localBackdrop: "studio_white",
      voiceScript: cta,
      textOverlay: text(cta, 60),
      motionEffect: "static",
    },
  }

  const beats = SCENE_BEATS_BY_MODE[input.mode]
  return {
    version: SCENE_PLAN_VERSION,
    source: "rule",
    mode: input.mode,
    topicId: input.topic.id,
    topicTitle: input.topic.title,
    emotionalTone: occasion.name,
    reasoning: `Kịch bản cơ bản (không dùng AI): dịp "${occasion.name}", tông màu ${palette.vi.join(", ") || "theo sản phẩm"}.`,
    ...completeScenePlanV2({
      mode: input.mode,
      topic: input.topic,
      platforms: input.platforms,
      outputs: input.outputs,
      scenes: beats.map((beat, i) => ({ sceneIndex: i + 1, beat, ...byBeat[beat] })),
    }),
  }
}
