/**
 * ALG Inputs Architecture v2.1 — AI Proposal Governance Engine (§10.1)
 *
 * Enforces:
 * 1. AI NEVER writes directly to production state.
 * 2. AI creates an immutable Proposal:
 *    (proposal_id, capability, target, diff, rationale, sources, confidence, risk_class, approver_rule, expires_at)
 * 3. Proposal transitions: PENDING -> APPROVED -> APPLIED (or REJECTED / EXPIRED).
 * 4. Sensitive actions ALWAYS require human approval: refund, change price, cancel order, grant permissions.
 */

import { type RiskClass } from "./policy-definition"

export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "APPLIED"

export interface ProposalDiff<T = unknown> {
  readonly oldValue: T
  readonly newValue: T
}

export interface ProposalSourceReference {
  readonly sourceId: string
  readonly title: string
  readonly version: string
  readonly uri?: string
}

export interface ProposalEntity<T = unknown> {
  readonly proposalId: string
  readonly organizationId: string
  readonly storeId?: string | undefined
  readonly capability: string
  readonly targetEntity: string
  readonly targetField: string
  readonly diff: ProposalDiff<T>
  readonly rationale: string
  readonly sources: readonly ProposalSourceReference[]
  readonly confidence: number // 0.0 to 1.0
  readonly riskClass: RiskClass
  readonly approverRole: string
  readonly expiresAt: Date
  readonly status: ProposalStatus
  readonly createdAt: Date
  readonly reviewedBy?: string | undefined
  readonly reviewedAt?: Date | undefined
  readonly rejectionReason?: string | undefined
}

export const MANDATORY_APPROVAL_FIELDS = [
  "pricing.product_price",
  "pricing.discount",
  "sales.refund_amount",
  "sales.cancel_order",
  "structure.role_permissions",
] as const

export function requiresHumanApproval(targetField: string, riskClass: RiskClass): boolean {
  if (riskClass === "R1_FINANCIAL_LEGAL") {
    return true
  }
  return (MANDATORY_APPROVAL_FIELDS as readonly string[]).includes(targetField)
}

export function createAiProposal<T>(params: {
  readonly proposalId: string
  readonly organizationId: string
  readonly storeId?: string
  readonly capability: string
  readonly targetEntity: string
  readonly targetField: string
  readonly oldValue: T
  readonly newValue: T
  readonly rationale: string
  readonly sources: readonly ProposalSourceReference[]
  readonly confidence: number
  readonly riskClass: RiskClass
  readonly approverRole: string
  readonly ttlHours?: number
}): ProposalEntity<T> {
  if (params.confidence < 0 || params.confidence > 1) {
    throw new Error("Độ tin cậy confidence phải nằm trong khoảng 0.0 đến 1.0")
  }

  const now = new Date()
  const ttl = params.ttlHours ?? 72
  const expiresAt = new Date(now.getTime() + ttl * 3600 * 1000)

  return {
    proposalId: params.proposalId,
    organizationId: params.organizationId,
    storeId: params.storeId,
    capability: params.capability,
    targetEntity: params.targetEntity,
    targetField: params.targetField,
    diff: {
      oldValue: params.oldValue,
      newValue: params.newValue,
    },
    rationale: params.rationale,
    sources: params.sources,
    confidence: params.confidence,
    riskClass: params.riskClass,
    approverRole: params.approverRole,
    expiresAt,
    status: "PENDING",
    createdAt: now,
  }
}

export function approveProposal<T>(
  proposal: ProposalEntity<T>,
  reviewerId: string,
  now: Date = new Date()
): ProposalEntity<T> {
  if (proposal.status !== "PENDING") {
    throw new Error(`Không thể duyệt đề xuất ở trạng thái ${proposal.status}`)
  }
  if (now.getTime() > proposal.expiresAt.getTime()) {
    throw new Error("Đề xuất đã hết hạn và không thể duyệt")
  }

  return {
    ...proposal,
    status: "APPROVED",
    reviewedBy: reviewerId,
    reviewedAt: now,
  }
}

export function rejectProposal<T>(
  proposal: ProposalEntity<T>,
  reviewerId: string,
  reason: string,
  now: Date = new Date()
): ProposalEntity<T> {
  if (proposal.status !== "PENDING") {
    throw new Error(`Không thể từ chối đề xuất ở trạng thái ${proposal.status}`)
  }

  return {
    ...proposal,
    status: "REJECTED",
    reviewedBy: reviewerId,
    reviewedAt: now,
    rejectionReason: reason,
  }
}
