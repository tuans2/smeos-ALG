/**
 * Writer v1 (`AIC-23 content_generation`) — viết MỘT bài cho MỘT kênh, chạy
 * song song theo kênh (mục 5.1 kế hoạch). Nhận Brief + (tuỳ chọn) chiến lược
 * của Strategist cho kênh đó; nếu Strategist hỏng, Writer viết thẳng từ
 * Brief (mục 4: "Strategist lỗi → Writer viết trực tiếp từ brief").
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
import type { StrategyChannelPlan } from "../strategist/v1"

export interface WriterOutput {
  readonly text: string
  readonly hashtags: readonly string[]
  readonly factIds: readonly string[]
}

export interface WriterPromptInput {
  readonly brief: ContentBrief
  readonly channel: PackageChannel
  /** null khi Strategist hỏng hoặc bị bỏ qua — Writer viết thẳng từ brief. */
  readonly strategy: StrategyChannelPlan | null
}

function buildPrompt(input: WriterPromptInput): string {
  const { brief, channel, strategy } = input
  const story = formatStoryForPrompt(brief)
  const limit = CHANNEL_TEXT_LIMITS[channel]
  const maxTags = channel === "instagram" ? INSTAGRAM_MAX_HASHTAGS : 15
  return `Bạn là người viết nội dung bán hàng cho cửa hàng hoa. Viết MỘT bài đăng cho kênh dưới đây, dựa CHỈ vào sự thật (facts) đã cho.

SẢN PHẨM: ${brief.product.name}
CHỦ ĐỀ: ${brief.topic.title}

SỰ THẬT (facts) — CHỈ được nói những gì có ở đây, mỗi câu quan trọng phải bám ít nhất một fact_id:
${formatFactsForPrompt(brief)}

TIỆM
${formatShopForPrompt(brief)}
${story ? `\nKỊCH BẢN CHẶNG 05 ĐI KÈM — bài phải kể CÙNG câu chuyện, không tạo câu chuyện khác:\n${story}\n` : ""}
${
  strategy
    ? `\nCHIẾN LƯỢC CHO KÊNH NÀY (đã được duyệt trước, hãy triển khai theo đúng góc này)
Góc: ${strategy.angle}
Hook gợi ý: ${strategy.hooks.join(" | ") || "(tự chọn)"}
Dàn ý: ${strategy.outline}
CTA: ${strategy.cta || "(dùng CTA mặc định của tiệm)"}
`
    : ""
}
${formatBannedNotice(brief)}

KÊNH: ${describeChannelForPrompt(channel)}

QUY TẮC
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

export type WriterNormalizeResult = { ok: true; output: WriterOutput } | { ok: false; reason: string }

function normalize(raw: unknown, channel: PackageChannel): WriterNormalizeResult {
  const o = raw as { text?: unknown; hashtags?: unknown; fact_ids?: unknown } | null
  const body = typeof o?.text === "string" ? o.text.trim() : ""
  if (body.length < 10) return { ok: false, reason: "Bài viết quá ngắn hoặc trống" }
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

export const WRITER_PROMPT_V1 = {
  id: "writer",
  version: "v1",
  build: buildPrompt,
  jsonSchema,
  normalize,
} as const
