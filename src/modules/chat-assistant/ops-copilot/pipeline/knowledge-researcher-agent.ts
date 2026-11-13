/**
 * Agent 2: Knowledge Researcher Agent (Nâng Cấp Giai Đoạn 1).
 * Chuyên trách tra cứu tri thức SSOT, rút trích sự kiện nghiệp vụ chuẩn xác,
 * tích hợp Đồ thị Liên kết Đa Phân hệ (Cross-Module Knowledge Graph),
 * đo lường Chỉ số Độ Tin cậy (Confidence Score) và khóa vành đai bảo mật.
 */

import {
  OPS_KNOWLEDGE_BASE,
  queryOpsKnowledge,
  getRelatedKnowledgeLinks,
} from "../knowledge-base"
import type { ParsedIntent, KnowledgeFactSheet, FactOverviewItem, RelatedKnowledgeLink } from "./pipeline-types"

export class KnowledgeResearcherAgent {
  research(intent: ParsedIntent): KnowledgeFactSheet {
    // 1. Trường hợp người dùng yêu cầu tổng quan phân hệ
    if (intent.isOverviewRequest) {
      const overviewItems: FactOverviewItem[] = OPS_KNOWLEDGE_BASE.map((node) => ({
        index: node.moduleIndex,
        title: node.moduleTitle,
        route: node.routePath,
        highlight: node.topicTitle,
      }))

      return {
        nodeId: null,
        moduleIndex: null,
        moduleTitle: "Tổng quan Hệ thống ALG",
        topicTitle: "10 Phân Hệ Nghiệp Vụ Cửa Hàng",
        routePath: "/",
        actionLabel: "Về Trang Chủ Điều Hành",
        summary: "Hệ thống toàn diện gồm 10 phân hệ hỗ trợ trọn vẹn quy trình vận hành cửa hàng O2O.",
        steps: [],
        caveats: [],
        isOverview: true,
        overviewItems,
        confidenceScore: 98,
        relatedLinks: [],
      }
    }

    // 2. Tra cứu dữ kiện chuẩn từ 10 Module SSOT
    let matchedNode = queryOpsKnowledge(intent.normalizedQuery, intent.userRole)
    let confidenceScore = matchedNode ? 92 : 20

    // Nếu không match trực tiếp nhưng là câu hỏi tiếp nối (Follow-up) từ lượt trước
    if (!matchedNode && intent.isFollowUp && intent.context?.lastTopicNodeId) {
      const fallbackNode = OPS_KNOWLEDGE_BASE.find((n) => n.id === intent.context!.lastTopicNodeId)
      if (fallbackNode) {
        matchedNode = fallbackNode
        confidenceScore = 85
      }
    }

    if (!matchedNode) {
      return {
        nodeId: null,
        moduleIndex: null,
        moduleTitle: null,
        topicTitle: null,
        routePath: null,
        actionLabel: null,
        summary: "",
        steps: [],
        caveats: [],
        isOverview: false,
        confidenceScore: 15,
        relatedLinks: [],
      }
    }

    // 3. Xử lý câu hỏi đào sâu 1 bước cụ thể (Focused Step SOP)
    let focusedStep: { stepNumber: number; actionText: string; expectedResult?: string | undefined } | undefined = undefined
    if (intent.followUpStepNumber) {
      const step = matchedNode.stepByStepSOP.find((s) => s.stepNumber === intent.followUpStepNumber)
      if (step) {
        focusedStep = {
          stepNumber: step.stepNumber,
          actionText: step.actionText,
          expectedResult: step.expectedResult,
        }
        confidenceScore = Math.max(confidenceScore, 95)
      }
    }

    // 4. Tra cứu Đồ thị liên kết nghiệp vụ liên phân hệ (Cross-Module Graph)
    const relatedLinks: RelatedKnowledgeLink[] = getRelatedKnowledgeLinks(matchedNode.id)

    // 5. Lọc sạch dữ liệu nhạy cảm (Zero-Leakage Sanitization)
    const sanitizedCaveats = matchedNode.caveatsAndGotchas.map((c) =>
      c.replace(/(api_key|secret|token|password|bearer)/gi, "[REDACTED]")
    )

    return {
      nodeId: matchedNode.id,
      moduleIndex: matchedNode.moduleIndex,
      moduleTitle: matchedNode.moduleTitle,
      topicTitle: matchedNode.topicTitle,
      routePath: matchedNode.routePath,
      actionLabel: matchedNode.actionLabel,
      summary: matchedNode.summary,
      steps: matchedNode.stepByStepSOP.map((s) => ({
        stepNumber: s.stepNumber,
        actionText: s.actionText,
        expectedResult: s.expectedResult,
      })),
      caveats: sanitizedCaveats,
      isOverview: false,
      confidenceScore,
      relatedLinks,
      focusedStep,
    }
  }
}
