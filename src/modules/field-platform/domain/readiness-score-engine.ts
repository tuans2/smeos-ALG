/**
 * ALG Inputs Architecture v2.1 — Readiness Score Engine (§8.2)
 *
 * Implements the 5-component weighted readiness score (0-100):
 * - Completeness (40%): % of required fields populated for stage
 * - Validity (20%): % of values passing schema and format validation
 * - Freshness (15%): % of time-sensitive fields within stale_after limit
 * - Consistency (15%): % of cross-domain invariants satisfied
 * - Approval (10%): % of items needing approval (R1 policies, KB) approved
 */

export interface FieldValueStatus {
  readonly fieldKey: string
  readonly isPopulated: boolean
  readonly isValid: boolean
  readonly isFresh: boolean
}

export interface ConsistencyCheck {
  readonly checkId: string
  readonly description: string
  readonly passed: boolean
}

export interface ApprovalItemStatus {
  readonly itemId: string
  readonly isApproved: boolean
}

export interface ReadinessScoreInput {
  readonly targetStage: "G1" | "G2" | "G3"
  readonly fields: readonly FieldValueStatus[]
  readonly consistencyChecks: readonly ConsistencyCheck[]
  readonly approvalItems: readonly ApprovalItemStatus[]
}

export interface ReadinessScoreBreakdown {
  readonly stage: "G1" | "G2" | "G3"
  readonly totalScore: number // 0 to 100
  readonly completenessScore: number // out of 40
  readonly validityScore: number // out of 20
  readonly freshnessScore: number // out of 15
  readonly consistencyScore: number // out of 15
  readonly approvalScore: number // out of 10
  readonly isGatePassed: boolean
  readonly blockingReasons: readonly string[]
}

export function calculateReadinessScore(input: ReadinessScoreInput): ReadinessScoreBreakdown {
  const blockingReasons: string[] = []

  // 1. Completeness (Weight: 40)
  const totalFields = input.fields.length
  const populatedFields = input.fields.filter((f) => f.isPopulated).length
  const completenessRate = totalFields > 0 ? populatedFields / totalFields : 1
  const completenessScore = Math.round(completenessRate * 40 * 10) / 10

  if (populatedFields < totalFields) {
    blockingReasons.push(
      `Còn thiếu ${totalFields - populatedFields} trường bắt buộc ở giai đoạn ${input.targetStage}`
    )
  }

  // 2. Validity (Weight: 20)
  const validFields = input.fields.filter((f) => f.isValid).length
  const validityRate = totalFields > 0 ? validFields / totalFields : 1
  const validityScore = Math.round(validityRate * 20 * 10) / 10

  // 3. Freshness (Weight: 15)
  const freshFields = input.fields.filter((f) => f.isFresh).length
  const freshnessRate = totalFields > 0 ? freshFields / totalFields : 1
  const freshnessScore = Math.round(freshnessRate * 15 * 10) / 10

  // 4. Consistency (Weight: 15)
  const totalConsistency = input.consistencyChecks.length
  const passedConsistency = input.consistencyChecks.filter((c) => c.passed).length
  const consistencyRate = totalConsistency > 0 ? passedConsistency / totalConsistency : 1
  const consistencyScore = Math.round(consistencyRate * 15 * 10) / 10

  for (const check of input.consistencyChecks) {
    if (!check.passed) {
      blockingReasons.push(`Vi phạm tính nhất quán: ${check.description}`)
    }
  }

  // 5. Approval (Weight: 10)
  const totalApprovals = input.approvalItems.length
  const passedApprovals = input.approvalItems.filter((a) => a.isApproved).length
  const approvalRate = totalApprovals > 0 ? passedApprovals / totalApprovals : 1
  const approvalScore = Math.round(approvalRate * 10 * 10) / 10

  // Total Score (0 - 100)
  const totalScore = Math.round(
    completenessScore + validityScore + freshnessScore + consistencyScore + approvalScore
  )

  // Hard gate requirement (§8.3): Completeness must be 100% and totalScore >= 90
  const isGatePassed = completenessRate === 1 && totalScore >= 90 && blockingReasons.length === 0

  return {
    stage: input.targetStage,
    totalScore,
    completenessScore,
    validityScore,
    freshnessScore,
    consistencyScore,
    approvalScore,
    isGatePassed,
    blockingReasons,
  }
}
