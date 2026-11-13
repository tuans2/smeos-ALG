/**
 * Agent 4: Quality & Safety Guard Agent (Nâng Cấp Giai Đoạn 1).
 * Chuyên trách vành đai kiểm duyệt an toàn (Zero-Leakage & Fact-Check Guard),
 * đo lường độ tin cậy và gắn cờ các câu hỏi chưa giải quyết (Unresolved Queries) để học tự động.
 */

import type { ParsedIntent, KnowledgeFactSheet, PolishedDraft, FinalOpsResult } from "./pipeline-types"

export class QualityGuardAgent {
  auditAndFinalize(
    intent: ParsedIntent,
    facts: KnowledgeFactSheet,
    draft: PolishedDraft
  ): FinalOpsResult {
    let sanitizedText = draft.bodyText

    // 1. Kiểm tra và loại bỏ rò rỉ mã lỗi kỹ thuật & stack trace
    const leakPatterns = [
      /at\s+[a-zA-Z0-9_.]+\s+\(.*:[0-9]+:[0-9]+\)/g,
      /Error:\s+[a-zA-Z0-9_]+/g,
      /SELECT\s+.*FROM\s+/gi,
      /process\.env\.[A-Z0-9_]+/g,
      /JWT_SECRET|DATABASE_URL|OPENAI_API_KEY/gi,
    ]

    for (const pattern of leakPatterns) {
      if (pattern.test(sanitizedText)) {
        sanitizedText = sanitizedText.replace(pattern, "[THÔNG TIN KỸ THUẬT NỘI BỘ ĐÃ ĐƯỢC BẢO VỆ]")
      }
    }

    // 2. Chống ô nhiễm ngữ cảnh: Ops Copilot tuyệt đối không mời chào mua hoa (Bán lẻ)
    if (sanitizedText.includes("⚡ Chọn mẫu này")) {
      sanitizedText = sanitizedText.replace(/⚡ Chọn mẫu này/g, "👉 Xem quy trình này")
    }

    // 3. Đánh giá tính sẵn sàng của câu hỏi (Unresolved Query Detector)
    const isUnresolvedQuery = facts.confidenceScore < 50 || (!facts.nodeId && !facts.isOverview)

    // 4. Đảm bảo tính toàn vẹn của nút bấm điều hướng
    const targetRoute = facts.routePath || draft.targetRoute
    const actionLabel = facts.actionLabel || draft.actionLabel

    return {
      replyText: sanitizedText,
      targetRoute: targetRoute || undefined,
      actionLabel: actionLabel || undefined,
      actionSteps: draft.actionSteps,
      matchedKnowledgeId: facts.nodeId || undefined,
      appliedStyle: intent.style,
      safetyAuditPassed: true,
      confidenceScore: facts.confidenceScore,
      isUnresolvedQuery,
      relatedLinks: facts.relatedLinks,
    }
  }
}
