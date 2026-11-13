/**
 * Sửa tại chỗ ở Chặng 07 (quyết định PO 24/09/2026): người dùng gõ yêu cầu,
 * AI viết lại — (1) MỘT cảnh của kịch bản bối cảnh (rồi sinh lại ảnh cảnh đó),
 * (2) MỘT bài đăng theo kênh. Phần thuần: lời nhắc, chuẩn hoá, chấm.
 */

import { checkFlowerContent } from "@/core/ai/domain/flower-content-guard"

import { CHANNEL_TEXT_LIMITS, INSTAGRAM_MAX_HASHTAGS, type PackageChannel } from "./campaign-package-rules"
import {
  inferLocalBackdrop,
  isLocalBackdrop,
  LOCAL_BACKDROPS,
  sanitizeBackgroundPrompt,
  type ScenePlanMotion,
  type ScenePlanScene,
} from "./scene-plan-rules"

export const SCENE_REVISE_FEATURE = "creative.scene_revise" as const
export const CONTENT_REWRITE_FEATURE = "creative.content_rewrite" as const
export const MAX_INSTRUCTION_LENGTH = 500

const MOTIONS: readonly ScenePlanMotion[] = ["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "static"]

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

// ============================================================
// (1) SỬA MỘT CẢNH
// ============================================================

export interface SceneReviseInput {
  readonly instruction: string
  readonly scene: ScenePlanScene
  readonly mode: "CREATIVE" | "AUTHENTIC"
  readonly topicTitle: string
  readonly productName: string
  readonly colors: readonly string[]
}

export function buildSceneRevisePrompt(input: SceneReviseInput): string {
  const s = input.scene
  const phong = Object.entries(LOCAL_BACKDROPS)
    .map(([id, mo]) => `  - ${id}: ${mo}`)
    .join("\n")
  return `Bạn là đạo diễn hình ảnh cho cửa hàng hoa. Sửa MỘT cảnh trong kịch bản bối cảnh theo YÊU CẦU của chủ tiệm.

CHỦ ĐỀ: ${input.topicTitle}
SẢN PHẨM: ${input.productName}${input.colors.length ? ` (màu: ${input.colors.join(", ")})` : ""}
MODE: ${input.mode}

CẢNH HIỆN TẠI (Cảnh ${s.sceneIndex} · ${s.beat})
- title: ${s.title}
- setting: ${s.setting}
- lighting: ${s.lighting}
- palette: ${s.palette.join(", ")}
- background_prompt: ${s.backgroundPrompt}
- local_backdrop: ${s.localBackdrop}
- voice_script: ${s.voiceScript}
- text_overlay: ${s.textOverlay}

YÊU CẦU CỦA CHỦ TIỆM
${input.instruction}

QUY TẮC
- Làm đúng yêu cầu; phần yêu cầu không nhắc tới thì giữ nguyên ý của cảnh hiện tại.
- Bó hoa thật được dán nguyên khối: KHÔNG mô tả hoa, người, bàn tay, chữ, logo trong bối cảnh — chỉ không gian, bề mặt, ánh sáng, màu.
- title, setting, lighting, voice_script, text_overlay: tiếng Việt có dấu; text_overlay tối đa 60 ký tự.
- background_prompt: tiếng Anh, 1–3 câu, chỉ tả không gian trống, dạng ảnh chụp sản phẩm chân thực.
- local_backdrop: một trong
${phong}
- motion_effect: một trong ${MOTIONS.join(" | ")}.

Trả về JSON: { "title", "setting", "lighting", "palette": string[], "background_prompt", "local_backdrop", "voice_script", "text_overlay", "motion_effect" }. Không thêm lời dẫn.`
}

export function sceneReviseJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      setting: { type: "string" },
      lighting: { type: "string" },
      palette: { type: "array", items: { type: "string" } },
      background_prompt: { type: "string" },
      local_backdrop: { type: "string", enum: Object.keys(LOCAL_BACKDROPS) },
      voice_script: { type: "string" },
      text_overlay: { type: "string" },
      motion_effect: { type: "string", enum: [...MOTIONS] },
    },
    required: ["setting", "background_prompt"],
  }
}

export type ReviseResult = { ok: true; scene: ScenePlanScene } | { ok: false; reason: string }

/** Chuẩn hoá cảnh AI trả về; trường thiếu thì GIỮ giá trị cũ (không bịa). */
export function normalizeRevisedScene(raw: unknown, current: ScenePlanScene): ReviseResult {
  const o = raw as Record<string, unknown> | null
  if (!o || typeof o !== "object") return { ok: false, reason: "Đầu ra không phải object" }
  const setting = text(o.setting, 300)
  const backgroundPrompt = sanitizeBackgroundPrompt(o.background_prompt)
  if (!setting) return { ok: false, reason: "Thiếu bối cảnh mới" }
  if (backgroundPrompt.length < 15) return { ok: false, reason: "Thiếu mô tả hậu cảnh dùng được" }
  const palette = Array.isArray(o.palette)
    ? o.palette.map((p) => text(p, 30)).filter(Boolean).slice(0, 5)
    : []
  return {
    ok: true,
    scene: {
      ...current,
      title: text(o.title, 80) || current.title,
      setting,
      lighting: text(o.lighting, 120) || current.lighting,
      palette: palette.length ? palette : current.palette,
      backgroundPrompt,
      localBackdrop: isLocalBackdrop(o.local_backdrop) ? o.local_backdrop : inferLocalBackdrop(setting),
      voiceScript: text(o.voice_script, 300) || current.voiceScript,
      // Phụ đề = lời thoại (PO 24/09/2026).
      textOverlay: text(o.voice_script, 300) || current.voiceScript,
      motionEffect: MOTIONS.includes(o.motion_effect as ScenePlanMotion)
        ? (o.motion_effect as ScenePlanMotion)
        : current.motionEffect,
    },
  }
}

// ============================================================
// (2) AI VIẾT LẠI MỘT BÀI ĐĂNG
// ============================================================

export interface ContentRewriteInput {
  readonly channel: PackageChannel
  readonly text: string
  readonly hashtags: readonly string[]
  readonly instruction: string
  readonly productName: string
  readonly topicTitle: string
  readonly priceRange?: string | undefined
  readonly brandForbidden?: string | null | undefined
  readonly brandTone?: string | null | undefined
}

const CHANNEL_NAME: Readonly<Record<PackageChannel, string>> = {
  facebook: "Facebook Fanpage",
  instagram: "Instagram",
  tiktok: "TikTok (mô tả video)",
  zalo: "Zalo OA",
}

export function buildContentRewritePrompt(input: ContentRewriteInput): string {
  const limit = CHANNEL_TEXT_LIMITS[input.channel]
  return `Bạn là người viết nội dung bán hàng cho cửa hàng hoa. Viết lại bài đăng ${CHANNEL_NAME[input.channel]} theo YÊU CẦU của chủ tiệm.

SẢN PHẨM: ${input.productName}
CHỦ ĐỀ: ${input.topicTitle}
${input.priceRange ? `KHOẢNG GIÁ THẬT: ${input.priceRange}` : "KHOẢNG GIÁ: chưa có — không nêu giá cụ thể"}
${input.brandTone ? `GIỌNG THƯƠNG HIỆU: ${input.brandTone}` : ""}
${input.brandForbidden ? `CỤM TỪ KHÔNG ĐƯỢC DÙNG: ${input.brandForbidden}` : ""}

BÀI HIỆN TẠI
${input.text}

HASHTAG HIỆN TẠI: ${input.hashtags.join(" ") || "(không có)"}

YÊU CẦU CỦA CHỦ TIỆM
${input.instruction}

QUY TẮC
- Làm đúng yêu cầu, giữ thông tin thật về sản phẩm; không bịa giá, số lượng, cam kết giao hàng hay khuyến mãi mà yêu cầu không nêu.
- Tối đa ${limit} ký tự cho phần bài (không tính hashtag).
- hashtags: tối đa ${input.channel === "instagram" ? INSTAGRAM_MAX_HASHTAGS : 15}, mỗi cái bắt đầu bằng #, không dấu cách.

Trả về JSON: { "text": string, "hashtags": string[] }. Không thêm lời dẫn.`
}

export function contentRewriteJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: { text: { type: "string" }, hashtags: { type: "array", items: { type: "string" } } },
    required: ["text"],
  }
}

export type RewriteResult =
  | { ok: true; text: string; hashtags: string[]; warnings: string[] }
  | { ok: false; reason: string }

/** Chuẩn hoá + kiểm từ cấm ngành hoa / thương hiệu. Vi phạm cứng → loại cả lượt. */
export function normalizeRewrite(raw: unknown, input: ContentRewriteInput): RewriteResult {
  const o = raw as { text?: unknown; hashtags?: unknown } | null
  const body = typeof o?.text === "string" ? o.text.trim() : ""
  if (body.length < 10) return { ok: false, reason: "Bài viết lại quá ngắn hoặc trống" }
  const limit = CHANNEL_TEXT_LIMITS[input.channel]
  const maxTags = input.channel === "instagram" ? INSTAGRAM_MAX_HASHTAGS : 15
  const hashtags = (Array.isArray(o?.hashtags) ? o.hashtags : [])
    .map((h) => (typeof h === "string" ? h.trim().replace(/\s+/g, "") : ""))
    .filter((h) => h.length > 1)
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .slice(0, maxTags)
  const check = checkFlowerContent(body, { brandForbiddenStyles: input.brandForbidden ?? null })
  if (!check.isValid) {
    return { ok: false, reason: `Bài viết lại dùng cụm từ bị cấm: ${check.hardBlocks.map((m) => m.phrase ?? "").join(", ")}` }
  }
  return {
    ok: true,
    text: body.slice(0, limit),
    hashtags: hashtags.length ? hashtags : [...input.hashtags],
    warnings: check.warnings.map((m) => m.phrase ?? "").filter(Boolean),
  }
}
