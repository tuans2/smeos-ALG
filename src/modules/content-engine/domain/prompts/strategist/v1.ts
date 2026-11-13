/**
 * Strategist v1 (`AIC-37 content_strategy`) — bước đầu chuỗi agent (mục 5.1
 * kế hoạch): đọc Brief, chọn góc/hook/dàn ý cho từng kênh TRƯỚC khi Writer
 * viết bài, để các kênh không lặp y hệt nhau nhưng vẫn kể chung một câu
 * chuyện. Không viết bài — chỉ ra chỉ dẫn cho Writer.
 *
 * Quy ước tệp prompt (mục 5.1): export {id, version, build, jsonSchema,
 * normalize}. Đổi số hiệu khi đổi hành vi mô hình thấy được — không sửa lặng
 * lẽ file này, tạo v2.
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

import type { PackageChannel } from "../../../../creative-production/domain/campaign-package-rules"
import type { ContentBrief } from "../../../contracts/brief"
import { describeChannelForPrompt } from "../../channel-specs"
import { formatBannedNotice, formatFactsForPrompt, formatShopForPrompt, formatStoryForPrompt } from "../format-brief"

export interface StrategyChannelPlan {
  readonly channel: PackageChannel
  readonly angle: string
  readonly hooks: readonly string[]
  readonly outline: string
  readonly factIds: readonly string[]
  readonly cta: string
}

export interface ContentStrategy {
  readonly coreMessage: string
  readonly channels: readonly StrategyChannelPlan[]
}

function buildPrompt(brief: ContentBrief, channels: readonly PackageChannel[]): string {
  const story = formatStoryForPrompt(brief)
  return `Bạn là chiến lược nội dung cho cửa hàng hoa. Đọc BRIEF dưới đây và lên chiến lược viết bài cho TỪNG kênh — KHÔNG viết bài, chỉ ra góc tiếp cận/hook/dàn ý để người viết (Writer) triển khai.

SẢN PHẨM: ${brief.product.name}
CHỦ ĐỀ: ${brief.topic.title}${brief.topic.angleCategory ? ` (nhóm góc: ${brief.topic.angleCategory})` : ""}

SỰ THẬT (facts) — CHỈ được dùng những mục dưới đây, mỗi ý trong chiến lược phải trích ít nhất một fact_id:
${formatFactsForPrompt(brief)}

TIỆM
${formatShopForPrompt(brief)}
${story ? `\nKỊCH BẢN CHẶNG 05 ĐÃ CÓ — chiến lược phải bám câu chuyện này, không tạo câu chuyện khác:\n${story}\n` : ""}
${formatBannedNotice(brief)}

CÁC KÊNH CẦN CHIẾN LƯỢC (${channels.length}):
${channels.map((c) => `- ${describeChannelForPrompt(c)}`).join("\n")}

YÊU CẦU
- coreMessage: một câu tóm tắt thông điệp chung, xuyên suốt mọi kênh.
- Với MỖI kênh ở trên, cho: angle (góc tiếp cận riêng cho kênh đó), hooks (1–3 câu mở đầu khác nhau để Writer chọn), outline (dàn ý ngắn gọn theo đúng cấu trúc của kênh), factIds (các fact_id sẽ dùng), cta (lời kêu gọi hành động — chỉ dùng CTA có trong facts/tiệm, không tự bịa cam kết).
- Các kênh nên có góc khác nhau (không lặp y hệt) nhưng không được mâu thuẫn nhau hay mâu thuẫn với kịch bản (nếu có).

Trả về JSON: { "core_message": string, "channels": [ { "channel": string, "angle": string, "hooks": string[], "outline": string, "fact_ids": string[], "cta": string } ] }. Không thêm lời dẫn.`
}

function jsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      core_message: { type: "string" },
      channels: {
        type: "array",
        items: {
          type: "object",
          properties: {
            channel: { type: "string" },
            angle: { type: "string" },
            hooks: { type: "array", items: { type: "string" } },
            outline: { type: "string" },
            fact_ids: { type: "array", items: { type: "string" } },
            cta: { type: "string" },
          },
          required: ["channel", "angle", "outline"],
        },
      },
    },
    required: ["core_message", "channels"],
  }
}

export type StrategistNormalizeResult = { ok: true; strategy: ContentStrategy } | { ok: false; reason: string }

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

function strList(v: unknown, max: number, itemMax: number): string[] {
  return Array.isArray(v)
    ? v
        .map((x) => text(x, itemMax))
        .filter(Boolean)
        .slice(0, max)
    : []
}

/** Chuẩn hoá đầu ra mô hình. Thiếu coreMessage hoặc không có kênh hợp lệ nào → lỗi (Strategist coi như hỏng, chuỗi fallback sang viết trực tiếp từ brief). */
function normalize(raw: unknown, expectedChannels: readonly PackageChannel[]): StrategistNormalizeResult {
  const o = raw as Record<string, unknown> | null
  if (!o || typeof o !== "object") return { ok: false, reason: "Đầu ra không phải object" }
  const coreMessage = text(o.core_message, 300)
  if (!coreMessage) return { ok: false, reason: "Thiếu core_message" }
  const rawChannels = Array.isArray(o.channels) ? o.channels : []
  const validSet = new Set(expectedChannels as readonly string[])
  const channels: StrategyChannelPlan[] = []
  for (const rc of rawChannels) {
    const c = rc as Record<string, unknown> | null
    if (!c || typeof c !== "object") continue
    const channel = typeof c.channel === "string" ? c.channel : ""
    if (!validSet.has(channel)) continue
    const angle = text(c.angle, 200)
    const outline = text(c.outline, 600)
    if (!angle || !outline) continue
    channels.push({
      channel: channel as PackageChannel,
      angle,
      hooks: strList(c.hooks, 3, 200),
      outline,
      factIds: strList(c.fact_ids, 20, 60),
      cta: text(c.cta, 150),
    })
  }
  if (channels.length === 0) return { ok: false, reason: "Không có kênh hợp lệ nào trong chiến lược" }
  return { ok: true, strategy: { coreMessage, channels } }
}

export const STRATEGIST_PROMPT_V1 = {
  id: "strategist",
  version: "v1",
  build: buildPrompt,
  jsonSchema,
  normalize,
} as const
