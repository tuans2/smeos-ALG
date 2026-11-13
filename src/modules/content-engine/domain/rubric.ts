/**
 * Rubric v1 — tiêu chí Critic (AIC-24 `content_qa`) chấm mỗi bài, có phiên
 * bản (mục 5 kế hoạch: nâng cấp đo được, không dựa cảm nhận). Tăng
 * `RUBRIC_VERSION` khi đổi tiêu chí/trọng số/ngưỡng — không sửa lặng lẽ.
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

export const RUBRIC_VERSION = "v1" as const

export type RubricChannelKey = "factual" | "brand" | "platform" | "story" | "readability"

export interface RubricCriterion {
  readonly key: RubricChannelKey
  readonly label: string
  readonly weight: number
}

/**
 * `story` chỉ tính khi bài có kịch bản Chặng 05 đi kèm (`brief.story` khác
 * null) — không có kịch bản thì không có gì để đối chiếu, loại khỏi tổng
 * trọng số thay vì chấm 0 oan (xem `weightedScore`).
 */
export const RUBRIC_V1: readonly RubricCriterion[] = [
  { key: "factual", label: "Đúng sự thật — chỉ nói những gì có trong facts[], không bịa", weight: 0.35 },
  { key: "brand", label: "Đúng giọng tiệm, không phạm phong cách cấm", weight: 0.2 },
  { key: "platform", label: "Đúng luật kênh: độ dài, hashtag, CTA, định dạng", weight: 0.2 },
  { key: "story", label: "Kể cùng câu chuyện với kịch bản Chặng 05", weight: 0.15 },
  { key: "readability", label: "Dễ đọc, mạch lạc, đúng văn phong tiếng Việt", weight: 0.1 },
]

/** Điểm dưới ngưỡng này → cần viết lại (mục 4 kế hoạch, `pipeline-rules.ts`). */
export const RUBRIC_ACCEPT_THRESHOLD = 0.75

/**
 * Điểm tổng theo trọng số, bỏ tiêu chí `story` khi bài không có kịch bản đi
 * kèm (không chấm 0 cho thứ brief không hứa có).
 */
export function weightedScore(scores: Partial<Record<RubricChannelKey, number>>, hasStory: boolean): number {
  const criteria = hasStory ? RUBRIC_V1 : RUBRIC_V1.filter((c) => c.key !== "story")
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight <= 0) return 0
  const sum = criteria.reduce((acc, c) => acc + clamp01(scores[c.key] ?? 0) * c.weight, 0)
  return sum / totalWeight
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}
