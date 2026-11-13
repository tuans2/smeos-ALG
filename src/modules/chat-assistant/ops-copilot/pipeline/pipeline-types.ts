/**
 * Ops Copilot Multi-Agent Pipeline Types.
 * Định nghĩa hợp đồng dữ liệu có cấu trúc giữa các tầng Agent (Giai đoạn 1 Nâng cấp).
 */

import type { OpsResponseStyle, OpsTargetRole } from "../knowledge-base/schema"

export interface HistoricalMessage {
  sender: "USER" | "ASSISTANT"
  content: string
  targetRoute?: string | undefined
  matchedKnowledgeId?: string | undefined
}

export interface ConversationContext {
  lastTopicNodeId?: string | undefined
  lastRoute?: string | undefined
  lastActionSteps?: string[] | undefined
  recentMessages?: HistoricalMessage[] | undefined
}

export interface ParsedIntent {
  rawQuery: string
  normalizedQuery: string
  userRole: OpsTargetRole
  displayRole?: string | undefined
  urgency: "NORMAL" | "HIGH" | "TROUBLE"
  style: OpsResponseStyle
  isOverviewRequest: boolean
  isFollowUp: boolean
  followUpStepNumber?: number | undefined
  matchedPatterns: string[]
  context?: ConversationContext | undefined
}

export interface FactOverviewItem {
  index: number
  title: string
  route: string
  highlight: string
}

export interface RelatedKnowledgeLink {
  nodeId: string
  title: string
  route: string
  relationReason: string
}

export interface KnowledgeFactSheet {
  nodeId: string | null
  moduleIndex: number | null
  moduleTitle: string | null
  topicTitle: string | null
  routePath: string | null
  actionLabel: string | null
  summary: string
  steps: Array<{
    stepNumber: number
    actionText: string
    expectedResult?: string | undefined
  }>
  caveats: string[]
  isOverview: boolean
  overviewItems?: FactOverviewItem[] | undefined
  confidenceScore: number
  relatedLinks: RelatedKnowledgeLink[]
  focusedStep?: {
    stepNumber: number
    actionText: string
    expectedResult?: string | undefined
  } | undefined
}

export interface PolishedDraft {
  greeting: string
  bodyText: string
  stepsText?: string | undefined
  tipsText?: string | undefined
  ctaText?: string | undefined
  targetRoute?: string | undefined
  actionLabel?: string | undefined
  actionSteps?: string[] | undefined
  relatedLinks?: RelatedKnowledgeLink[] | undefined
}

export interface FinalOpsResult {
  replyText: string
  targetRoute?: string | undefined
  actionLabel?: string | undefined
  actionSteps?: string[] | undefined
  matchedKnowledgeId?: string | undefined
  appliedStyle?: OpsResponseStyle | undefined
  safetyAuditPassed: boolean
  confidenceScore: number
  isUnresolvedQuery: boolean
  relatedLinks?: RelatedKnowledgeLink[] | undefined
}
