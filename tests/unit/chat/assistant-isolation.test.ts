import { describe, it, expect, vi, beforeEach } from "vitest"
import { OpsCopilotEngine } from "@/modules/chat-assistant/ops-copilot/domain/ops-copilot-engine"
import { SalesConciergeProvider } from "@/modules/chat-assistant/sales-concierge/adapters/sales-concierge-provider"
import type { ProductMasterIndex } from "@/modules/products/domain/product-master-index"

// ---------------------------------------------------------------------------
// Mock fetch → LLM luôn thất bại trong unit test → kích hoạt template fallback
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("No network in unit tests")))
})

describe("Kiến trúc phân tách: Ops Copilot (Vận hành SaaS) vs Sales Concierge (Bán hoa khách hàng)", () => {
  const dummyProducts: ProductMasterIndex[] = [
    {
      id: "prod-1",
      code: "HOA-001",
      name: "Bó Hoa Hồng Đỏ Khai Trương",
      pricing: { quotePriceVnd: 500000, costPriceVnd: 250000 },
      occasions: ["Khai trương", "Sinh nhật"],
      category: "Bó hoa",
      bom: { wrapStyle: "Hàn Quốc", flowers: [], foliage: [], wrapping: [], ribbon: "", accessories: [] },
      approvalStatus: "APPROVED",
      images: [],
    } as unknown as ProductMasterIndex,
  ]

  describe("1. OpsCopilotEngine (Trợ lý Vận hành SaaS nội bộ)", () => {
    const engine = new OpsCopilotEngine()

    it("giải đáp chính xác câu hỏi nghiệp vụ in phiếu xưởng ẩn giá M10 kèm deep link", async () => {
      const result = await engine.processQuery({
        query: "Làm sao để in phiếu cắm hoa giấu giá cho thợ xưởng?",
        userRole: "Điều phối",
      })

      expect(result.replyText).toContain("Phiếu Xưởng Ẩn Giá")
      expect(result.replyText).toContain("Điều phối")
      expect(result.targetRoute).toBe("/don-hang")
      expect(result.actionLabel).toBe("Mở Bảng Quản Lý Đơn Hàng")
      expect(result.actionSteps?.length).toBeGreaterThan(0)
    })

    it("giải đáp quy trình tạo link thẻ chào gửi Zalo cho nhân viên", async () => {
      const result = await engine.processQuery({
        query: "Cách tạo link thẻ chào gửi Zalo cho khách và cọc VietQR?",
        userRole: "Sale",
      })

      expect(result.replyText).toContain("Brochure")
      expect(result.targetRoute).toBe("/the-chao")
      expect(result.actionLabel).toBe("Mở Bộ sưu tập riêng")
    })

    it("trả về hướng dẫn tổng quan các phân hệ khi câu hỏi không khớp 1 mục cụ thể (không đóng vai bán hoa)", async () => {
      const result = await engine.processQuery({
        query: "Hệ thống có những tính năng gì hỗ trợ tiệm hoa?",
      })

      expect(result.replyText).toContain("smeOS Ops Copilot")
      expect(result.replyText).toContain("Phân tích hoa")
      expect(result.replyText).toContain("Đơn Hàng & Xưởng")
      // Không chứa nội dung mời chào mua hoa cho khách
      expect(result.replyText).not.toContain("⚡ Chọn mẫu này")
    })
  })

  describe("2. SalesConciergeProvider (Trợ lý Tư vấn Bán hoa cho Khách hàng)", () => {
    const provider = new SalesConciergeProvider()

    it("tư vấn mẫu hoa phù hợp ngân sách và dịp tặng cho khách mua hoa", async () => {
      const result = await provider.send({
        query: "Tìm bó hoa khai trương tầm 500k",
        conversationId: "conv-test-1",
        masterProducts: dummyProducts,
      })

      expect(result.replyText).toContain("Khai trương")
      expect(result.suggestedFlowers.length).toBeGreaterThan(0)
      expect(result.suggestedFlowers[0]?.productName).toBe("Bó Hoa Hồng Đỏ Khai Trương")
      expect(result.detectedBudget).toBe(500000)
      expect(result.detectedOccasion).toBe("Khai trương")
    })

    it("ZERO-LEAKAGE: Không bao giờ trả về mã M01-M14 hay lộ quy trình nội bộ dù khách hỏi mẹo", async () => {
      const result = await provider.send({
        query: "Làm sao để bóc tách cành hoa và in phiếu xưởng giấu giá?",
        conversationId: "conv-test-2",
        masterProducts: dummyProducts,
      })

      // Phản hồi dưới góc độ nhân viên tiệm hoa, không leak SaaS ops
      expect(result.replyText).not.toContain("m10_florist_ticket")
      expect(result.replyText).not.toContain("Lát cắt Thợ Cắm Hoa")
      expect(result.replyText).not.toContain("Bảng Kanban Đơn Hàng")
    })

    it("khi tiệm chưa có mẫu hoa sẵn, trả lời lịch sự nhã nhặn, KHÔNG bảo khách vào mục M01 upload ảnh", async () => {
      const result = await provider.send({
        query: "Có hoa lan hồ điệp tím không?",
        conversationId: "conv-test-3",
        masterProducts: [], // Tiệm chưa có mẫu hoa
      })

      expect(result.suggestedFlowers.length).toBe(0)
      // Kiểm tra tuyệt đối không có hướng dẫn khách upload ảnh hoa M01
      expect(result.replyText).not.toContain("Phân tích hoa (M01)")
      expect(result.replyText).not.toContain("tải ảnh chụp mẫu hoa lên")
      expect(result.replyText).not.toContain("/tai-anh")
    })
  })
})
