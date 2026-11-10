import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  IntentAnalyzerAgent,
  KnowledgeResearcherAgent,
  ToneSynthesizerAgent,
  QualityGuardAgent,
  OpsCopilotOrchestrator,
} from "@/modules/chat-assistant/ops-copilot/pipeline"

// ---------------------------------------------------------------------------
// Mock fetch toàn cục → LLM luôn thất bại trong unit test → kích hoạt fallback
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("No network in unit tests")))
})

describe("Ops Copilot Multi-Agent Pipeline Architecture (Giai Đoạn 1 Nâng Cấp)", () => {
  describe("Tầng 1: Intent & Context Analyzer Agent", () => {
    const agent = new IntentAnalyzerAgent()

    it("phân tích câu hỏi bình thường và nhận diện vai trò", () => {
      const intent = agent.analyze("tạo thẻ bộ sưu tập thế nào ?", "Sale")
      expect(intent.userRole).toBe("BAN_HANG")
      expect(intent.urgency).toBe("NORMAL")
      expect(intent.isOverviewRequest).toBe(false)
      expect(intent.matchedPatterns).toContain("bộ sưu tập")
    })

    it("nhận diện trạng thái TROUBLE khi có từ khóa lỗi", () => {
      const intent = agent.analyze("tại sao không tải được ảnh mẫu hoa?", "Quản lý")
      expect(intent.urgency).toBe("TROUBLE")
      expect(intent.style).toBe("TROUBLESHOOTER")
    })

    it("nhận diện trạng thái HIGH khi cần thao tác gấp", () => {
      const intent = agent.analyze("hướng dẫn nhanh in phiếu xưởng", "Thợ cắm")
      expect(intent.urgency).toBe("HIGH")
      expect(intent.style).toBe("FAST_SOP")
    })

    it("nhận diện câu hỏi tổng quan hệ thống", () => {
      const intent = agent.analyze("FloraOS có những chức năng gì?")
      expect(intent.isOverviewRequest).toBe(true)
    })

    it("nhận diện câu hỏi tiếp nối đa lượt (Multi-turn Follow-up) và số bước cụ thể", () => {
      const intent = agent.analyze("bước 2 làm thế nào ?", "Sale", undefined, {
        lastTopicNodeId: "node-03-the-chao",
      })
      expect(intent.isFollowUp).toBe(true)
      expect(intent.followUpStepNumber).toBe(2)
    })
  })

  describe("Tầng 2: Knowledge Researcher Agent (SSOT & Cross-Module Graph)", () => {
    const intentAgent = new IntentAnalyzerAgent()
    const researchAgent = new KnowledgeResearcherAgent()

    it("trích xuất chính xác dữ kiện SSOT kèm liên kết đa phân hệ", () => {
      const intent = intentAgent.analyze("tạo thẻ bộ sưu tập thế nào ?", "Sale")
      const facts = researchAgent.research(intent)

      expect(facts.nodeId).toBe("node-03-the-chao")
      expect(facts.moduleIndex).toBe(3)
      expect(facts.routePath).toBe("/the-chao")
      expect(facts.actionLabel).toBe("Mở Bộ sưu tập riêng")
      expect(facts.steps.length).toBeGreaterThan(0)
      expect(facts.caveats.length).toBeGreaterThan(0)
      expect(facts.confidenceScore).toBeGreaterThanOrEqual(90)
      // Kiểm tra Đồ thị liên kết liên phân hệ (Cross-Module Links)
      expect(facts.relatedLinks.some((l) => l.nodeId === "node-09-ho-so-cua-hang")).toBe(true)
    })

    it("đào sâu bước cụ thể khi có câu hỏi tiếp nối", () => {
      const intent = intentAgent.analyze("bước 2 làm thế nào ?", "Sale", undefined, {
        lastTopicNodeId: "node-03-the-chao",
      })
      const facts = researchAgent.research(intent)

      expect(facts.nodeId).toBe("node-03-the-chao")
      expect(facts.focusedStep).toBeDefined()
      expect(facts.focusedStep?.stepNumber).toBe(2)
      expect(facts.focusedStep?.actionText).toContain("Chọn bộ sưu tập")
    })
  })

  describe("Tầng 3: Tone & Copywriting Synthesizer Agent (LLM fallback)", () => {
    const intentAgent = new IntentAnalyzerAgent()
    const researchAgent = new KnowledgeResearcherAgent()
    const toneAgent = new ToneSynthesizerAgent()

    it("biên tập phản hồi chuẩn mực, đầy đủ SOP và gợi ý liên phân hệ (qua template fallback)", async () => {
      const intent = intentAgent.analyze("tạo thẻ bộ sưu tập thế nào ?", "Sale")
      const facts = researchAgent.research(intent)
      const draft = await toneAgent.synthesize(intent, facts)

      // Template fallback vẫn đảm bảo metadata chuẩn
      expect(draft.targetRoute).toBe("/the-chao")
      expect(draft.actionLabel).toBe("Mở Bộ sưu tập riêng")
      expect(draft.bodyText).toContain("Liên kết nghiệp vụ liên quan:")
    })

    it("biên tập phong cách riêng biệt cho câu hỏi đào sâu 1 bước", async () => {
      const intent = intentAgent.analyze("bước 3 làm sao ?", "Sale", undefined, {
        lastTopicNodeId: "node-03-the-chao",
      })
      const facts = researchAgent.research(intent)
      const draft = await toneAgent.synthesize(intent, facts)

      expect(draft.bodyText).toContain("hướng dẫn chi tiết **Bước 3**")
    })

    it("trả về template fallback khi LLM không khả dụng", async () => {
      const intent = intentAgent.analyze("tạo thẻ bộ sưu tập thế nào ?", "Sale")
      const facts = researchAgent.research(intent)
      const draft = await toneAgent.synthesize(intent, facts)

      // Luôn có kết quả — không bao giờ throw
      expect(draft.bodyText).toBeTruthy()
      expect(draft.targetRoute).toBe("/the-chao")
    })
  })

  describe("Tầng 4: Quality & Safety Guard Agent", () => {
    const guardAgent = new QualityGuardAgent()

    it("đánh dấu Unresolved Query và Confidence Score thấp khi câu hỏi vô nghĩa", () => {
      const intent = new IntentAnalyzerAgent().analyze("hỏi linh tinh abcxyz 12345")
      const facts = new KnowledgeResearcherAgent().research(intent)
      const draft = {
        greeting: "Xin chào",
        bodyText: "Em chưa nhận diện được thao tác",
      }

      const finalized = guardAgent.auditAndFinalize(intent, facts, draft)
      expect(finalized.isUnresolvedQuery).toBe(true)
      expect(finalized.confidenceScore).toBeLessThan(50)
      expect(finalized.safetyAuditPassed).toBe(true)
    })
  })

  describe("Orchestrator Toàn Chuỗi (Full Pipeline Execution)", () => {
    const orchestrator = new OpsCopilotOrchestrator()

    it("vận hành mượt mà câu hỏi tạo thẻ bộ sưu tập từ đầu đến cuối", async () => {
      const result = await orchestrator.execute({
        query: "tạo thẻ bộ sưu tập thế nào ?",
        userRole: "Nhân viên bán hàng",
      })

      expect(result.matchedKnowledgeId).toBe("node-03-the-chao")
      expect(result.targetRoute).toBe("/the-chao")
      expect(result.actionLabel).toBe("Mở Bộ sưu tập riêng")
      expect(result.replyText).toBeTruthy()
      expect(result.confidenceScore).toBeGreaterThanOrEqual(90)
      expect(result.isUnresolvedQuery).toBe(false)
      expect(result.safetyAuditPassed).toBe(true)
    })

    it("xử lý hội thoại tiếp nối 2 lượt (Turn 1 -> Turn 2)", async () => {
      // Lượt 1: Hỏi tạo thẻ
      const turn1 = await orchestrator.execute({
        query: "tạo thẻ bộ sưu tập thế nào ?",
        userRole: "Sale",
      })
      expect(turn1.matchedKnowledgeId).toBe("node-03-the-chao")

      // Lượt 2: Hỏi tiếp "bước 3 làm sao?"
      const turn2 = await orchestrator.execute({
        query: "bước 3 làm sao ?",
        userRole: "Sale",
        context: {
          lastTopicNodeId: turn1.matchedKnowledgeId,
          lastRoute: turn1.targetRoute,
        },
      })

      expect(turn2.matchedKnowledgeId).toBe("node-03-the-chao")
      expect(turn2.replyText).toContain("Bước 3")
      expect(turn2.targetRoute).toBe("/the-chao")
    })
  })
})
