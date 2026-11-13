/**
 * Luật chuỗi agent (mục 4 kế hoạch): điều kiện viết lại, số vòng tối đa,
 * cách gộp điểm cuối. Thuần — không gọi AI, không import Prisma; chuỗi thật
 * (`use-cases/generate-content.ts`) chỉ đọc quyết định từ đây.
 */

import type { DeterministicCheckIssue } from "./deterministic-checks"
import { RUBRIC_ACCEPT_THRESHOLD, weightedScore, type RubricChannelKey } from "./rubric"

/** `enqueueJob` feature — cùng khoá dùng ở `pricing.ts` (`FEATURE_COST_CREDIT`) và use-case. */
export const CONTENT_GENERATE_FEATURE = "content.generate" as const

/**
 * Thời hạn chờ MỖI lượt gọi mô hình của một agent. Chuỗi chạy tại chỗ trong
 * request của người dùng (Strategist → Writer → Critic → Rewriter), nên mỗi
 * bước phải có trần — hết hạn thì cổng AI coi là lượt hỏng và đi nhánh dự
 * phòng, không giữ request treo theo nhà cung cấp.
 */
export const AGENT_CALL_TIMEOUT_MS = 40_000

/**
 * Mọi kênh đều phải dùng khuôn tất định vì Writer hỏng hết — tức nhà cung
 * cấp AI không viết được gì cho lượt này. Khi đó KHÔNG coi là thành công:
 * khách trả credit cho bài AI viết, không phải cho khuôn ghép sẵn (cùng lý lẽ
 * D3 của `refund-policy.ts`). Một phần kênh rơi về khuôn thì vẫn giao, đánh
 * dấu `needs_review`.
 */
export function allChannelsFellBack(sources: readonly string[]): boolean {
  return sources.length > 0 && sources.every((s) => s === "template")
}

/** Mặc định tối đa 1 vòng viết lại (mục 4 kế hoạch). */
export const MAX_REWRITE_ROUNDS = 1

export interface ChannelRewriteDecision {
  readonly needsRewrite: boolean
  readonly overallScore: number
  readonly reasons: readonly string[]
}

/**
 * Viết lại khi: có lỗi tất định REJECTED, HOẶC điểm Critic dưới ngưỡng.
 * Lỗi tất định mức NEEDS_REVIEW (vd độ dài hơi lệch khoảng khuyến nghị)
 * không MỘT MÌNH bắt viết lại — chỉ góp vào điểm qua Critic.
 */
export function decideChannelRewrite(input: {
  readonly deterministicIssues: readonly DeterministicCheckIssue[]
  readonly criticScores: Partial<Record<RubricChannelKey, number>>
  readonly hasStory: boolean
  readonly threshold?: number
}): ChannelRewriteDecision {
  const threshold = input.threshold ?? RUBRIC_ACCEPT_THRESHOLD
  const overallScore = weightedScore(input.criticScores, input.hasStory)
  const reasons: string[] = []

  const rejected = input.deterministicIssues.filter((i) => i.severity === "REJECTED")
  for (const issue of rejected) reasons.push(issue.message)

  if (overallScore < threshold) {
    reasons.push(`Điểm Critic ${overallScore.toFixed(2)} dưới ngưỡng ${threshold}`)
  }

  return { needsRewrite: reasons.length > 0, overallScore, reasons }
}

/** Điểm tổng của cả lượt sinh — trung bình các kênh đã chạy (không tính kênh lỗi cứng). */
export function aggregateOverallScore(channelScores: readonly number[]): number {
  if (channelScores.length === 0) return 0
  return channelScores.reduce((a, b) => a + b, 0) / channelScores.length
}

/**
 * Sau vòng viết lại tối đa mà vẫn còn lỗi REJECTED hoặc điểm dưới ngưỡng —
 * đánh dấu cần người soát (`needs_review`), KHÔNG chặn kết quả (mục 4: "kênh
 * vẫn trượt sau N vòng → needs_review", không phải job FAILED).
 */
export function needsHumanReview(decision: ChannelRewriteDecision, roundsUsed: number): boolean {
  return decision.needsRewrite && roundsUsed >= MAX_REWRITE_ROUNDS
}
