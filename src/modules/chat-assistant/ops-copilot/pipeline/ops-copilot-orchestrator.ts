/**
 * Ops Copilot Multi-Agent Orchestrator.
 * Điều phối tuần tự 4 Agent chuyên trách trong chuỗi Pipeline:
 * Tầng 1: Intent & Context Analyzer
 * Tầng 2: Knowledge Researcher (SSOT)
 * Tầng 3: Tone & Copywriting Synthesizer (LLM-powered)
 * Tầng 4: Quality & Safety Guard
 */

import { IntentAnalyzerAgent } from "./intent-analyzer-agent"
import { KnowledgeResearcherAgent } from "./knowledge-researcher-agent"
import { ToneSynthesizerAgent } from "./tone-synthesizer-agent"
import { QualityGuardAgent } from "./quality-guard-agent"
import type { FinalOpsResult } from "./pipeline-types"
import type { OpsResponseStyle } from "../knowledge-base"

export interface ExecutePipelineInput {
  query: string
  userRole?: string | undefined
  requestedStyle?: OpsResponseStyle | undefined
  context?: import("./pipeline-types").ConversationContext | undefined
}

export class OpsCopilotOrchestrator {
  private intentAgent: IntentAnalyzerAgent
  private researchAgent: KnowledgeResearcherAgent
  private toneAgent: ToneSynthesizerAgent
  private guardAgent: QualityGuardAgent

  constructor(deps?: {
    intentAgent?: IntentAnalyzerAgent
    researchAgent?: KnowledgeResearcherAgent
    toneAgent?: ToneSynthesizerAgent
    guardAgent?: QualityGuardAgent
  }) {
    this.intentAgent = deps?.intentAgent ?? new IntentAnalyzerAgent()
    this.researchAgent = deps?.researchAgent ?? new KnowledgeResearcherAgent()
    this.toneAgent = deps?.toneAgent ?? new ToneSynthesizerAgent()
    this.guardAgent = deps?.guardAgent ?? new QualityGuardAgent()
  }

  async execute(input: ExecutePipelineInput): Promise<FinalOpsResult> {
    // Tầng 1: Phân tích câu hỏi, nhận diện vai trò, ngữ cảnh đa lượt & phong cách phản hồi
    const intent = this.intentAgent.analyze(input.query, input.userRole, input.requestedStyle, input.context)

    // Tầng 2: Tra cứu tri thức chuẩn hóa SSOT (10 Module), bảo vệ vành đai dữ liệu
    const factSheet = this.researchAgent.research(intent)

    // Tầng 3: Tổng hợp ngôn từ tự nhiên qua cổng AI (không gọi được → mẫu tĩnh)
    const draft = await this.toneAgent.synthesize(intent, factSheet)

    // Tầng 4: Kiểm duyệt an toàn, chặn rò rỉ mã lỗi, chuẩn hóa nút bấm
    const finalized = this.guardAgent.auditAndFinalize(intent, factSheet, draft)

    return finalized
  }
}
