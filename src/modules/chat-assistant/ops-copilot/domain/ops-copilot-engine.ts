/**
 * smeOS Ops Copilot Engine (Domain Service).
 * Trợ lý Vận hành SaaS smeOS chuẩn Commercial & Production.
 * Tích hợp Kiến trúc Multi-Agent Pipeline Đa Tầng (4 Chuyên Trách):
 * 1. Intent & Context Analyzer Agent
 * 2. Knowledge Researcher Agent (SSOT)
 * 3. Tone & Copywriting Synthesizer Agent (LLM-powered)
 * 4. Quality & Safety Guard Agent
 */

import type { OpsResponseStyle } from "../knowledge-base"
import { OpsCopilotOrchestrator } from "../pipeline"

export interface OpsCopilotQueryInput {
  query: string
  userRole?: string | undefined
  requestedStyle?: OpsResponseStyle | undefined
  context?: import("../pipeline").ConversationContext | undefined
}

export interface OpsCopilotQueryResult {
  replyText: string
  targetRoute?: string | undefined
  actionLabel?: string | undefined
  actionSteps?: string[] | undefined
  matchedKnowledgeId?: string | undefined
  appliedStyle?: OpsResponseStyle | undefined
  confidenceScore?: number | undefined
  isUnresolvedQuery?: boolean | undefined
  relatedLinks?: import("../pipeline").RelatedKnowledgeLink[] | undefined
}

export class OpsCopilotEngine {
  private orchestrator: OpsCopilotOrchestrator

  constructor(orchestrator = new OpsCopilotOrchestrator()) {
    this.orchestrator = orchestrator
  }

  async processQuery(input: OpsCopilotQueryInput): Promise<OpsCopilotQueryResult> {
    const trimmed = input.query.trim()
    if (!trimmed) {
      return {
        replyText: "Dạ, em là ALG Ops Copilot! Anh/chị cần hướng dẫn thao tác tính năng nào trên hệ thống ạ?",
      }
    }

    const result = await this.orchestrator.execute({
      query: trimmed,
      userRole: input.userRole,
      requestedStyle: input.requestedStyle,
      context: input.context,
    })

    return {
      replyText: result.replyText,
      targetRoute: result.targetRoute,
      actionLabel: result.actionLabel,
      actionSteps: result.actionSteps,
      matchedKnowledgeId: result.matchedKnowledgeId,
      appliedStyle: result.appliedStyle,
      confidenceScore: result.confidenceScore,
      isUnresolvedQuery: result.isUnresolvedQuery,
      relatedLinks: result.relatedLinks,
    }
  }
}
