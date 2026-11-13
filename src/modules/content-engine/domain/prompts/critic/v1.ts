/**
 * Critic v1 (`AIC-24 content_qa`) — chấm TẤT CẢ các kênh trong MỘT lượt gọi
 * (mục 5.1 kế hoạch: Critic đọc toàn bộ để phát hiện mâu thuẫn XUYÊN kênh,
 * không chỉ chấm riêng lẻ). Chấm theo `RUBRIC_V1` (`domain/rubric.ts`).
 * Không tự tính điểm tổng có trọng số — đó là việc của `weightedScore()`
 * (thuần, không qua mô hình) trong `pipeline-rules.ts`.
 *
 * Quy ước tệp prompt (mục 5.1): export {id, version, build, jsonSchema,
 * normalize}.
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

import type { PackageChannel } from "../../../../creative-production/domain/campaign-package-rules"
import type { ContentBrief } from "../../../contracts/brief"
import { RUBRIC_V1, type RubricChannelKey } from "../../rubric"
import { formatBannedNotice, formatFactsForPrompt, formatShopForPrompt, formatStoryForPrompt } from "../format-brief"

export interface CriticChannelResult {
  readonly channel: PackageChannel
  readonly scores: Partial<Record<RubricChannelKey, number>>
  readonly issues: readonly string[]
  readonly fixInstructions: string
}

export interface CriticOutput {
  readonly channels: readonly CriticChannelResult[]
}

export interface CriticPostToReview {
  readonly channel: PackageChannel
  readonly text: string
  readonly hashtags: readonly string[]
}

const CRITERIA_KEYS = RUBRIC_V1.map((c) => c.key)

function buildPrompt(brief: ContentBrief, posts: readonly CriticPostToReview[]): string {
  const hasStory = brief.story !== null && brief.story !== undefined
  const story = formatStoryForPrompt(brief)
  const criteriaList = RUBRIC_V1.filter((c) => hasStory || c.key !== "story")
    .map((c) => `  - ${c.key}: ${c.label} (thang 0–1)`)
    .join("\n")
  return `Bạn là biên tập viên kiểm duyệt nội dung cho cửa hàng hoa. Chấm điểm TỪNG bài dưới đây theo đúng các tiêu chí, đối chiếu với sự thật (facts) — không được tự thêm tiêu chí khác.

SẢN PHẨM: ${brief.product.name}
CHỦ ĐỀ: ${brief.topic.title}

SỰ THẬT (facts) — bài nào nói điều KHÔNG có ở đây thì tiêu chí "factual" phải chấm thấp:
${formatFactsForPrompt(brief)}

TIỆM
${formatShopForPrompt(brief)}
${story ? `\nKỊCH BẢN CHẶNG 05 ĐI KÈM — tiêu chí "story" chấm mức độ bài kể ĐÚNG câu chuyện này:\n${story}\n` : ""}
${formatBannedNotice(brief)}

TIÊU CHÍ CHẤM (mỗi kênh):
${criteriaList}

CÁC BÀI CẦN CHẤM (${posts.length}):
${posts
  .map(
    (p, i) => `--- Bài ${i + 1} · kênh ${p.channel} ---
${p.text}
Hashtag: ${p.hashtags.join(" ") || "(không có)"}`
  )
  .join("\n\n")}

YÊU CẦU
- Chấm ĐỦ các kênh ở trên, mỗi kênh một mục điểm cho từng tiêu chí (0 = sai/thiếu hoàn toàn, 1 = đạt hoàn toàn).
- issues: liệt kê ngắn gọn các lỗi cụ thể tìm thấy (nếu có) — vd "nói giá không có trong facts", "lặp lại đúng câu của kênh khác", "trái với kịch bản".
- fixInstructions: hướng dẫn ngắn, cụ thể để người viết lại sửa (bỏ trống nếu bài đạt, không cần sửa).
- Nếu các bài mâu thuẫn nhau (vd nói giá khác nhau) — hạ điểm "factual" của TẤT CẢ các bài liên quan và nêu rõ trong issues.

Trả về JSON: { "channels": [ { "channel": string, "scores": { ${CRITERIA_KEYS.map((k) => `"${k}": number`).join(", ")} }, "issues": string[], "fix_instructions": string } ] }. Không thêm lời dẫn.`
}

function jsonSchema(): Record<string, unknown> {
  const scoreProps: Record<string, unknown> = {}
  for (const k of CRITERIA_KEYS) scoreProps[k] = { type: "number" }
  return {
    type: "object",
    properties: {
      channels: {
        type: "array",
        items: {
          type: "object",
          properties: {
            channel: { type: "string" },
            scores: { type: "object", properties: scoreProps },
            issues: { type: "array", items: { type: "string" } },
            fix_instructions: { type: "string" },
          },
          required: ["channel", "scores"],
        },
      },
    },
    required: ["channels"],
  }
}

export type CriticNormalizeResult = { ok: true; output: CriticOutput } | { ok: false; reason: string }

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

function clamp01(n: unknown): number | undefined {
  if (typeof n !== "number" || Number.isNaN(n)) return undefined
  return Math.min(1, Math.max(0, n))
}

/** Thiếu điểm cho một kênh mong đợi → coi Critic hỏng cho kênh đó, chuỗi rơi về kiểm tất định (mục 4). */
function normalize(raw: unknown, expectedChannels: readonly PackageChannel[]): CriticNormalizeResult {
  const o = raw as Record<string, unknown> | null
  if (!o || typeof o !== "object") return { ok: false, reason: "Đầu ra không phải object" }
  const rawChannels = Array.isArray(o.channels) ? o.channels : []
  const validSet = new Set(expectedChannels as readonly string[])
  const channels: CriticChannelResult[] = []
  for (const rc of rawChannels) {
    const c = rc as Record<string, unknown> | null
    if (!c || typeof c !== "object") continue
    const channel = typeof c.channel === "string" ? c.channel : ""
    if (!validSet.has(channel)) continue
    const rawScores = (c.scores as Record<string, unknown> | undefined) ?? {}
    const scores: Partial<Record<RubricChannelKey, number>> = {}
    for (const k of CRITERIA_KEYS) {
      const v = clamp01(rawScores[k])
      if (v !== undefined) scores[k] = v
    }
    if (Object.keys(scores).length === 0) continue
    channels.push({
      channel: channel as PackageChannel,
      scores,
      issues: Array.isArray(c.issues) ? c.issues.map((i) => text(i, 300)).filter(Boolean).slice(0, 20) : [],
      fixInstructions: text(c.fix_instructions, 800),
    })
  }
  if (channels.length === 0) return { ok: false, reason: "Không chấm được kênh nào" }
  return { ok: true, output: { channels } }
}

export const CRITIC_PROMPT_V1 = {
  id: "critic",
  version: "v1",
  build: buildPrompt,
  jsonSchema,
  normalize,
} as const
