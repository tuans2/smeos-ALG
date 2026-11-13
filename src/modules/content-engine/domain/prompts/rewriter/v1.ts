/**
 * Rewriter v1 (`AIC-23 content_generation`, dùng lại năng lực của Writer) —
 * viết lại MỘT kênh đã bị Critic/kiểm tất định từ chối, theo đúng
 * `fixInstructions` (mục 4/5.1 kế hoạch). Chỉ chạy tối đa
 * `MAX_REWRITE_ROUNDS` vòng (`pipeline-rules.ts`) — không tự lặp ở đây.
 *
 * Đầu ra cùng hình dạng với Writer (`WriterOutput`) để chuỗi dùng lại nguyên
 * bước kiểm tất định sau khi viết lại.
 *
 * Quy ước tệp prompt (mục 5.1): export {id, version, build, jsonSchema,
 * normalize}.
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

import { CHANNEL_TEXT_LIMITS, INSTAGRAM_MAX_HASHTAGS, type PackageChannel } from "../../../../creative-production/domain/campaign-package-rules"
import type { ContentBrief } from "../../../contracts/brief"
import { describeChannelForPrompt } from "../../channel-specs"
import { formatBannedNotice, formatFactsForPrompt, formatShopForPrompt, formatStoryForPrompt } from "../format-brief"
import type { WriterOutput } from "../writer/v1"

export interface RewriterPromptInput {
  readonly brief: ContentBrief
  readonly channel: PackageChannel
  readonly previousText: string
  readonly previousHashtags: readonly string[]
  /** Gộp lý do từ kiểm tất định (REJECTED) và/hoặc `fixInstructions` của Critic. */
  readonly issues: readonly string[]
  readonly fixInstructions: string
}

function buildPrompt(input: RewriterPromptInput): string {
  const { brief, channel, previousText, previousHashtags, issues, fixInstructions } = input
  const story = formatStoryForPrompt(brief)
  const limit = CHANNEL_TEXT_LIMITS[channel]
  const maxTags = channel === "instagram" ? INSTAGRAM_MAX_HASHTAGS : 15
  return `Bạn là người viết nội dung bán hàng cho cửa hàng hoa. Bài dưới đây đã bị từ chối/chấm thấp — VIẾT LẠI để sửa đúng các lỗi đã nêu, dựa CHỈ vào sự thật (facts) đã cho.

SẢN PHẨM: ${brief.product.name}
CHỦ ĐỀ: ${brief.topic.title}

SỰ THẬT (facts) — CHỈ được nói những gì có ở đây:
${formatFactsForPrompt(brief)}

TIỆM
${formatShopForPrompt(brief)}
${story ? `\nKỊCH BẢN CHẶNG 05 ĐI KÈM — bài phải kể CÙNG câu chuyện:\n${story}\n` : ""}
${formatBannedNotice(brief)}

BÀI CŨ (kênh ${channel})
${previousText}
Hashtag cũ: ${previousHashtags.join(" ") || "(không có)"}

LỖI CẦN SỬA
${issues.length ? issues.map((i) => `- ${i}`).join("\n") : "(không có lỗi cụ thể, chỉ cần cải thiện chung theo hướng dẫn dưới)"}
${fixInstructions ? `\nHƯỚNG DẪN SỬA: ${fixInstructions}` : ""}

KÊNH: ${describeChannelForPrompt(channel)}

QUY TẮC
- Sửa ĐÚNG các lỗi đã nêu; phần không bị nêu lỗi thì giữ nguyên tinh thần bài cũ.
- Tối đa ${limit} ký tự cho phần bài (không tính hashtag).
- hashtags: tối đa ${maxTags}, mỗi cái bắt đầu bằng #, không dấu cách.
- Không bịa giá, số lượng, cam kết giao hàng hay khuyến mãi ngoài facts.
- fact_ids: liệt kê các fact_id đã dùng để viết bài này.

Trả về JSON: { "text": string, "hashtags": string[], "fact_ids": string[] }. Không thêm lời dẫn.`
}

function jsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      text: { type: "string" },
      hashtags: { type: "array", items: { type: "string" } },
      fact_ids: { type: "array", items: { type: "string" } },
    },
    required: ["text"],
  }
}

export type RewriterNormalizeResult = { ok: true; output: WriterOutput } | { ok: false; reason: string }

function normalize(raw: unknown, channel: PackageChannel): RewriterNormalizeResult {
  const o = raw as { text?: unknown; hashtags?: unknown; fact_ids?: unknown } | null
  const body = typeof o?.text === "string" ? o.text.trim() : ""
  if (body.length < 10) return { ok: false, reason: "Bài viết lại quá ngắn hoặc trống" }
  const limit = CHANNEL_TEXT_LIMITS[channel]
  const maxTags = channel === "instagram" ? INSTAGRAM_MAX_HASHTAGS : 15
  const hashtags = (Array.isArray(o?.hashtags) ? o.hashtags : [])
    .map((h) => (typeof h === "string" ? h.trim().replace(/\s+/g, "") : ""))
    .filter((h) => h.length > 1)
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .slice(0, maxTags)
  const factIds = (Array.isArray(o?.fact_ids) ? o.fact_ids : [])
    .map((f) => (typeof f === "string" ? f.trim() : ""))
    .filter(Boolean)
  return {
    ok: true,
    output: { text: body.slice(0, limit), hashtags, factIds: [...new Set(factIds)] },
  }
}

export const REWRITER_PROMPT_V1 = {
  id: "rewriter",
  version: "v1",
  build: buildPrompt,
  jsonSchema,
  normalize,
} as const
