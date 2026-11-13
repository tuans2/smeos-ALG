import { OUTPUT_STANDARDS_01 } from "./output-standard"

export interface QcScoreItem {
  readonly code: string
  readonly score: number
  readonly passed: boolean
  readonly reason?: string | undefined
}

export interface PhotoEnhanceQcEvaluation {
  readonly passed: boolean
  readonly overallScore: number
  readonly mandatoryPassed: boolean
  readonly failedCriteria: readonly string[]
  readonly retryHint: string | null
  readonly items: readonly QcScoreItem[]
}

export const MAX_RETRY_COUNT = 2

export function evaluateQc(scores: Record<string, number>): PhotoEnhanceQcEvaluation {
  const items: QcScoreItem[] = []
  const failedCriteria: string[] = []
  let mandatoryPassed = true
  let totalScore = 0
  let count = 0

  for (const std of OUTPUT_STANDARDS_01) {
    const rawScore = scores[std.code] ?? 1.0
    const passed = rawScore >= std.threshold
    if (!passed) {
      failedCriteria.push(std.code)
      if (std.type === "MANDATORY") {
        mandatoryPassed = false
      }
    }
    items.push({
      code: std.code,
      score: rawScore,
      passed,
    })
    totalScore += rawScore
    count++
  }

  const overallScore = count > 0 ? Number((totalScore / count).toFixed(2)) : 1.0
  const passed = mandatoryPassed && overallScore >= 0.8

  let retryHint: string | null = null
  if (!passed) {
    if (!mandatoryPassed) {
      retryHint = "Cần giữ nguyên 100% hình thái và thông số nhận diện của sản phẩm gốc."
    } else {
      retryHint = "Cải thiện phông nền và điều chỉnh cân bằng ánh sáng studio dịu hơn."
    }
  }

  return {
    passed,
    overallScore,
    mandatoryPassed,
    failedCriteria,
    retryHint,
    items,
  }
}

export function canRetry(currentRetryCount: number, qcResult: PhotoEnhanceQcEvaluation): boolean {
  return !qcResult.passed && currentRetryCount < MAX_RETRY_COUNT
}
