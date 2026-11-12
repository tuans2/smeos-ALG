import { describe, it, expect, vi, beforeEach } from "vitest"
import { OpsCopilotEngine } from "@/modules/chat-assistant/ops-copilot/domain/ops-copilot-engine"
import {
  queryOpsKnowledge,
  detectResponseStyle,
  OPS_KNOWLEDGE_BASE,
} from "@/modules/chat-assistant/ops-copilot/knowledge-base"

// ---------------------------------------------------------------------------
// Mock fetch → LLM luôn thất bại trong unit test → kích hoạt template fallback
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("No network in unit tests")))
})

describe("Ops Copilot Knowledge Base & Adaptive Persona Engine (10 Chức Năng Production)", () => {
  const engine = new OpsCopilotEngine()

  describe("1. Kiểm tra bao phủ 10/10 Chức năng thực tế từ bộ tài liệu", () => {
    it("Chức năng 01: Trang Chủ ('/') — ChoiceGrid & StoreGrowthCenter", () => {
      const match = queryOpsKnowledge("Làm sao chuyển sang Chế độ Chuyên gia trên Trang chủ để xem việc tồn đọng?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(1)
      expect(match?.routePath).toBe("/")
      expect(match?.actionLabel).toContain("Trang Chủ")
    })

    it("Chức năng 02: Quản Lý Đơn Hàng ('/don-hang') — Phiếu xưởng ẩn giá & In A6", () => {
      const match = queryOpsKnowledge("Tôi muốn in phiếu cắm hoa cho xưởng mà không lộ giá bán?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(2)
      expect(match?.routePath).toBe("/don-hang")
      expect(match?.topicTitle).toContain("Phiếu Xưởng Ẩn Giá")
    })

    it("Chức năng 03: Thẻ Chào Mẫu Hoa ('/the-chao') — Brochure di động & Cọc VietQR", () => {
      const match = queryOpsKnowledge("Cách tạo link thẻ chào gửi Zalo cho khách và quét cọc VietQR?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(3)
      expect(match?.routePath).toBe("/the-chao")
      expect(match?.topicTitle).toContain("VietQR")
    })

    it("Chức năng 04: Sản Phẩm & Giá ('/san-pham') — Bảng giá & Lọc theo dịp", () => {
      const match = queryOpsKnowledge("Lọc danh mục hoa theo khoảng giá và dịp lễ ở đâu?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(4)
      expect(match?.routePath).toBe("/san-pham")
      expect(match?.topicTitle).toContain("Bảng Giá Niêm Yết")
    })

    it("Chức năng 05: Tạo Mẫu Hoa Mới ('/san-pham/tao-moi') — Công thức cành hoa BOM & Costing", () => {
      const match = queryOpsKnowledge("Cách nhập công thức cành hoa BOM và tính giá vốn costing?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(5)
      expect(match?.routePath).toBe("/san-pham/tao-moi")
      expect(match?.topicTitle).toContain("Công Thức Định Lượng BOM")
    })

    it("Chức năng 06: Nhập từ Excel & Ảnh ('/san-pham/nhap-hang-loat') — File mẫu & Google Drive", () => {
      const match = queryOpsKnowledge("Tải file Excel mẫu để nhập hàng loạt mẫu hoa và link Drive?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(6)
      expect(match?.routePath).toBe("/san-pham/nhap-hang-loat")
      expect(match?.topicTitle).toContain("Google Drive")
    })

    it("Chức năng 07: Quét Ảnh Hoa AI ('/tai-anh') — Vision đếm cành & Kịch bản Zalo", () => {
      const match = queryOpsKnowledge("Quy trình 3 chặng quét ảnh hoa AI và tạo kịch bản Zalo chốt đơn?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(7)
      expect(match?.routePath).toBe("/tai-anh")
      expect(match?.topicTitle).toContain("Thị Giác")
    })

    it("Chức năng 08: Kho Dữ Liệu ('/kho-du-lieu') — 4 Phân vùng tài sản số & Thùng rác", () => {
      const match = queryOpsKnowledge("Bốn phân vùng lưu trữ ảnh gốc raw và thùng rác 30 ngày ở đâu?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(8)
      expect(match?.routePath).toBe("/kho-du-lieu")
      expect(match?.topicTitle).toContain("4 Phân Vùng Lưu Trữ")
    })

    it("Chức năng 09: Hồ Sơ Cửa Hàng ('/ho-so') — Cấu hình 5 Tab & STK ngân hàng VietQR", () => {
      const match = queryOpsKnowledge("Cài đặt số tài khoản ngân hàng nhận tiền cọc VietQR ở đâu?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(9)
      expect(match?.routePath).toBe("/ho-so")
      expect(match?.topicTitle).toContain("Ngân Hàng VietQR")
    })

    it("Chức năng 10: Cài Đặt & Quản Lý Thành Viên ('/cai-dat/thanh-vien') — Cấp tài khoản 10s", () => {
      const match = queryOpsKnowledge("Cách cấp tài khoản nhân viên mới dùng ngay trong 10 giây và phân quyền?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(10)
      expect(match?.routePath).toBe("/cai-dat/thanh-vien")
      expect(match?.topicTitle).toContain("Cấp Tài Khoản Nhân Viên")
    })

    it("Chức năng 11: Khách hàng ('/khach-hang') — khách xin xoá / bản sao dữ liệu cá nhân", () => {
      const match = queryOpsKnowledge("Khách xin xoá dữ liệu cá nhân của mình thì làm thế nào?")
      expect(match).not.toBeNull()
      expect(match?.moduleIndex).toBe(11)
      expect(match?.routePath).toBe("/khach-hang")
    })
  })

  describe("2. Bộ 4 Phong cách phản hồi thích ứng (Adaptive Persona Styles)", () => {
    it("Style CONSULTANT: Kích hoạt cho vai trò Quản lý / Điều hành với góc nhìn quản trị", async () => {
      expect(detectResponseStyle("Quy trình phân quyền thành viên ra sao?", "Quản lý cửa hàng")).toBe("CONSULTANT")

      const res = await engine.processQuery({
        query: "Quy trình phân quyền và cấp tài khoản nhân viên?",
        userRole: "Quản lý cửa hàng",
      })

      expect(res.appliedStyle).toBe("CONSULTANT")
      expect(res.replyText).toContain("[Cố vấn Vận hành smeOS]")
      expect(res.replyText).toContain("Khuyến nghị quản trị")
      expect(res.targetRoute).toBe("/cai-dat/thanh-vien")
    })

    it("Style COACH: Kích hoạt cho vai trò Thợ cắm hoa / Bán hàng với văn phong cầm tay chỉ việc", async () => {
      expect(detectResponseStyle("Làm sao in phiếu cắm hoa xưởng?", "Thợ cắm hoa")).toBe("COACH")

      const res = await engine.processQuery({
        query: "Làm sao in phiếu cắm hoa xưởng?",
        userRole: "Thợ cắm hoa",
      })

      expect(res.appliedStyle).toBe("COACH")
      expect(res.replyText).toContain("Dạ, em xin phép hướng dẫn anh/chị")
      expect(res.targetRoute).toBe("/don-hang")
    })

    it("Style TROUBLESHOOTER: Kích hoạt tự động khi câu hỏi chứa từ khóa sự cố/lỗi", async () => {
      expect(detectResponseStyle("Tại sao bị lỗi không tải được ảnh từ link Google Drive?")).toBe("TROUBLESHOOTER")

      const res = await engine.processQuery({
        query: "Lỗi không tải được ảnh Google Drive khi nhập Excel?",
      })

      expect(res.appliedStyle).toBe("TROUBLESHOOTER")
      expect(res.replyText).toContain("[Khắc phục Sự cố & Hướng dẫn Xử lý Nhanh]")
      expect(res.targetRoute).toBe("/san-pham/nhap-hang-loat")
    })

    it("Style FAST_SOP: Kích hoạt khi người dùng yêu cầu thao tác gấp/tóm tắt nhanh", async () => {
      expect(detectResponseStyle("Tóm tắt nhanh cách tạo thẻ chào gửi Zalo")).toBe("FAST_SOP")

      const res = await engine.processQuery({
        query: "Tóm tắt nhanh cách tạo thẻ chào gửi Zalo",
      })

      expect(res.appliedStyle).toBe("FAST_SOP")
      expect(res.replyText).toContain("[Thao tác Nhanh]")
      expect(res.targetRoute).toBe("/the-chao")
    })
  })

  describe("3. Đảm bảo cấu trúc 4 khối và cảnh báo nghiệp vụ thực tế", () => {
    it("câu trả lời luôn có các bước SOP và cảnh báo rủi ro (Caveats)", async () => {
      const res = await engine.processQuery({
        query: "Cách nhập danh mục hoa từ file Excel?",
      })

      expect(res.actionSteps?.length).toBeGreaterThan(0)
      expect(res.actionLabel).toBe("Mở Màn Hình Nhập Excel Hàng Loạt")
      expect(res.replyText).toContain("LƯU Ý QUAN TRỌNG VỀ GOOGLE DRIVE")
    })

    it("khi hỏi câu hỏi chung chung, hướng dẫn phân luồng cả 10 chức năng", async () => {
      const res = await engine.processQuery({
        query: "Hệ thống FloraOS có những chức năng gì?",
      })

      expect(res.replyText).toContain("1. **Trang Chủ")
      expect(res.replyText).toContain("2. **Đơn Hàng")
      expect(res.replyText).toContain("3. **Bộ sưu tập riêng")
      expect(res.replyText).toContain("10. **Cài Đặt & Thành Viên")
      expect(res.replyText).toContain("11. **Khách Hàng")
    })
  })
})
