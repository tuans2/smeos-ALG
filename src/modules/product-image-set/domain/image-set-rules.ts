import { OUTPUT_STANDARDS_02 } from "./output-standard"

export interface SetVariantQcScore {
  readonly variantId: string
  readonly scores: Record<string, number>
  readonly passed: boolean
  readonly failedCriteria: readonly string[]
  readonly retryHint?: string | undefined
}

export interface ImageSetQcEvaluation {
  readonly passed: boolean
  readonly setConsistencyScore: number
  readonly variantScores: readonly SetVariantQcScore[]
  readonly overallScore: number
}

export const MAX_SET_RETRY_COUNT = 2

export function evaluateSetQc(
  variants: Array<{ id: string; scores: Record<string, number> }>,
  overallConsistencyScore: number = 0.96
): ImageSetQcEvaluation {
  const variantScores: SetVariantQcScore[] = []
  let allVariantsPassed = true
  let totalScoreSum = 0

  for (const v of variants) {
    const failedCriteria: string[] = []
    let variantPassed = true
    let vScoreSum = 0
    let vCount = 0

    for (const std of OUTPUT_STANDARDS_02) {
      if (std.isSetLevel) continue
      const rawScore = v.scores[std.code] ?? 1.0
      const ok = rawScore >= std.threshold
      if (!ok) {
        failedCriteria.push(std.code)
        if (std.type === "MANDATORY") variantPassed = false
      }
      vScoreSum += rawScore
      vCount++
    }

    const avgVScore = vCount > 0 ? vScoreSum / vCount : 1.0
    if (avgVScore < 0.8) variantPassed = false
    if (!variantPassed) allVariantsPassed = false

    totalScoreSum += avgVScore
    variantScores.push({
      variantId: v.id,
      scores: v.scores,
      passed: variantPassed,
      failedCriteria,
      retryHint: !variantPassed ? "Đảm bảo hình thái và chi tiết sản phẩm đồng nhất với ảnh gốc." : undefined,
    })
  }

  const overallScore =
    variants.length > 0
      ? Number(((totalScoreSum / variants.length) * 0.7 + overallConsistencyScore * 0.3).toFixed(2))
      : 1.0

  const setPassed = allVariantsPassed && overallConsistencyScore >= 0.95

  return {
    passed: setPassed,
    setConsistencyScore: overallConsistencyScore,
    variantScores,
    overallScore,
  }
}
